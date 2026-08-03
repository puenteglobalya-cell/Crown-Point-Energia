import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Importa la hoja "resumen por yacimiento" tal como la arma el equipo
// técnico en su Excel de gestión: una fila ancha por yacimiento con
// provincia + tipo de recuperación + IIBB (petróleo/gas) + participación en
// la concesión + regalía, en vez de 4 tablas normalizadas separadas.
//
// Layout esperado (filas 1-3 = encabezados, datos desde la fila 4):
// A provincia | B yacimiento | C tipo_recuperacion | D iibb_petroleo |
// E iibb_gas | F participacion_desde | G participacion_hasta |
// H participacion_pct | I participacion_motivo | J regalia_desde | K regalia_pct
//
// Acá concesión y yacimiento son el mismo nombre — la concesión tiene que
// existir de antes (con sus fechas de inicio/vencimiento cargadas por la
// hoja "concesiones" normal) porque esta fila no las trae.
function celdaATexto(v: ExcelJS.CellValue): string {
  if (v == null) return ''
  if (v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`
  if (typeof v === 'object') {
    if ('text' in v && typeof (v as any).text === 'string') return (v as any).text
    if ('result' in v) return celdaATexto((v as any).result)
    if ('richText' in v) return (v as any).richText.map((r: any) => r.text).join('')
  }
  return String(v)
}

function celdaANumero(v: ExcelJS.CellValue): number | null {
  const t = celdaATexto(v).trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  const nombreHoja = String(form.get('hoja') ?? '')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  if (!nombreHoja) return NextResponse.json({ error: 'Falta el nombre de la hoja' }, { status: 400 })

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any)
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo — ¿es un .xlsx válido?' }, { status: 400 })
  }
  const ws = wb.getWorksheet(nombreHoja)
  if (!ws) return NextResponse.json({ error: `No encontré la hoja "${nombreHoja}"` }, { status: 400 })

  const db = createSupabaseServerAdminClient()
  const reporte: { fila: number; error: string }[] = []

  const filas: { numero: number; c: string[] }[] = []
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const c = Array.from({ length: 11 }, (_, i) => celdaATexto(row.getCell(i + 1).value))
    if (c.every(x => x.trim() === '')) continue
    filas.push({ numero: r, c })
  }
  if (filas.length === 0) return NextResponse.json({ error: 'No hay filas de datos desde la fila 4' }, { status: 400 })

  let provincias = 0, yacimientosN = 0, participaciones = 0, regalias = 0

  for (const { numero, c } of filas) {
    const [provinciaNombre, yacimientoNombre, tipoRecuperacion, iibbPetroleo, , partDesde, partHasta, partPct, partMotivo, regDesde, regPct] = c

    if (!provinciaNombre || !yacimientoNombre) { reporte.push({ fila: numero, error: 'Falta provincia o yacimiento' }); continue }

    const iibb = celdaANumero(iibbPetroleo)
    let { data: prov } = await db.from('provincias').select('id').eq('nombre', provinciaNombre).maybeSingle()
    if (!prov) {
      const { data: nueva, error } = await db.from('provincias').insert({ nombre: provinciaNombre, alicuota_iibb: iibb ?? 0.03 }).select('id').single()
      if (error) { reporte.push({ fila: numero, error: `Provincia: ${error.message}` }); continue }
      prov = nueva; provincias++
    }

    let { data: yac } = await db.from('yacimientos').select('id').eq('nombre', yacimientoNombre).maybeSingle()
    if (!yac) {
      const { data: nuevo, error } = await db.from('yacimientos')
        .insert({ nombre: yacimientoNombre, provincia_id: prov!.id, tipo_recuperacion: tipoRecuperacion || null })
        .select('id').single()
      if (error) { reporte.push({ fila: numero, error: `Yacimiento: ${error.message}` }); continue }
      yac = nuevo; yacimientosN++
    } else {
      await db.from('yacimientos').update({ provincia_id: prov!.id, tipo_recuperacion: tipoRecuperacion || null }).eq('id', yac.id)
    }

    // Concesión == yacimiento, mismo nombre. Tiene que existir de antes (con
    // sus fechas), esta hoja no las trae.
    const { data: conc } = await db.from('concesiones').select('id').eq('nombre', yacimientoNombre).maybeSingle()
    if (!conc) {
      reporte.push({ fila: numero, error: `No existe la concesión "${yacimientoNombre}" — cargala primero en la hoja "concesiones" (con fecha de inicio/vencimiento) y volvé a importar esta fila` })
      continue
    }

    if (partDesde && partPct) {
      const pct = celdaANumero(partPct)
      if (pct == null) { reporte.push({ fila: numero, error: 'Participación: % inválido' }); continue }
      const { error } = await db.from('concesion_participacion').insert({
        concesion_id: conc.id, fecha_desde: partDesde, fecha_hasta: partHasta || null, porcentaje: pct, motivo: partMotivo || null,
      })
      if (error) { reporte.push({ fila: numero, error: `Participación: ${error.message}` }); continue }
      participaciones++
    }

    if (regDesde && regPct) {
      const pct = celdaANumero(regPct)
      if (pct == null) { reporte.push({ fila: numero, error: 'Regalía: % inválido' }); continue }
      const { error } = await db.from('regalias').insert({ concesion_id: conc.id, fecha_desde: regDesde, porcentaje: pct })
      if (error) { reporte.push({ fila: numero, error: `Regalía: ${error.message}` }); continue }
      regalias++
    }
  }

  return NextResponse.json({ ok: true, provincias, yacimientos: yacimientosN, participaciones, regalias, reporte })
}
