import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Un solo upload que procesa el Excel real del equipo técnico tal como lo
// arman ellos — no la plantilla normalizada de 28 hojas. Busca, en el mismo
// archivo, la hoja "provincias" (fila ancha por yacimiento) y la hoja
// "formulas_precio" (pronóstico de Brent por año + parámetros de la fórmula,
// repetidos en cada fila). Cada hoja se procesa si existe; si falta alguna,
// se ignora esa parte sin error.

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

// La fórmula del DDE% viene como celda de fórmula de Excel, no como valor
// plano — hay que leer el texto de la fórmula (o de la fórmula "maestra" si
// la celda sólo comparte una fórmula de otra) para sacar los quiebres de
// Brent (ej. "<=65" y ">=80") y los % en cada extremo.
function formulaTexto(ws: ExcelJS.Worksheet, v: ExcelJS.CellValue): string | null {
  if (v == null || typeof v !== 'object') return null
  if ('formula' in v && typeof (v as any).formula === 'string') return (v as any).formula
  if ('sharedFormula' in v && typeof (v as any).sharedFormula === 'string') {
    const master = ws.getCell((v as any).sharedFormula).value
    return formulaTexto(ws, master)
  }
  return null
}

function extraerTramoDde(formula: string | null): { min: number; pctMin: number; max: number; pctMax: number } | null {
  if (!formula) return null
  const min = formula.match(/<=\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/)
  const max = formula.match(/>=\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/)
  if (!min || !max) return null
  return { min: Number(min[1]), pctMin: Number(min[2]) * 100, max: Number(max[1]), pctMax: Number(max[2]) * 100 }
}

async function procesarProvincias(db: ReturnType<typeof createSupabaseServerAdminClient>, ws: ExcelJS.Worksheet, reporte: { hoja: string; fila: number; error: string }[]) {
  let provincias = 0, yacimientosN = 0, participaciones = 0, regalias = 0
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const c = Array.from({ length: 11 }, (_, i) => celdaATexto(row.getCell(i + 1).value))
    if (c.every(x => x.trim() === '')) continue
    const [provinciaNombre, yacimientoNombre, tipoRecuperacion, iibbPetroleo, , partDesde, partHasta, partPct, partMotivo, regDesde, regPct] = c
    if (!provinciaNombre || !yacimientoNombre) { reporte.push({ hoja: 'provincias', fila: r, error: 'Falta provincia o yacimiento' }); continue }

    const iibb = celdaANumero(iibbPetroleo)
    let { data: prov } = await db.from('provincias').select('id').eq('nombre', provinciaNombre).maybeSingle()
    if (!prov) {
      const { data: nueva, error } = await db.from('provincias').insert({ nombre: provinciaNombre, alicuota_iibb: iibb ?? 0.03 }).select('id').single()
      if (error) { reporte.push({ hoja: 'provincias', fila: r, error: `Provincia: ${error.message}` }); continue }
      prov = nueva; provincias++
    }

    let { data: yac } = await db.from('yacimientos').select('id').eq('nombre', yacimientoNombre).maybeSingle()
    if (!yac) {
      const { data: nuevo, error } = await db.from('yacimientos')
        .insert({ nombre: yacimientoNombre, provincia_id: prov!.id, tipo_recuperacion: tipoRecuperacion || null })
        .select('id').single()
      if (error) { reporte.push({ hoja: 'provincias', fila: r, error: `Yacimiento: ${error.message}` }); continue }
      yac = nuevo; yacimientosN++
    } else {
      await db.from('yacimientos').update({ provincia_id: prov!.id, tipo_recuperacion: tipoRecuperacion || null }).eq('id', yac.id)
    }

    const { data: conc } = await db.from('concesiones').select('id').eq('nombre', yacimientoNombre).maybeSingle()
    if (!conc) {
      reporte.push({ hoja: 'provincias', fila: r, error: `No existe la concesión "${yacimientoNombre}" — cargala primero (con fecha de inicio/vencimiento) y volvé a importar esta fila` })
      continue
    }

    if (partDesde && partPct) {
      const pct = celdaANumero(partPct)
      if (pct == null) { reporte.push({ hoja: 'provincias', fila: r, error: 'Participación: % inválido' }); continue }
      const { error } = await db.from('concesion_participacion').insert({
        concesion_id: conc.id, fecha_desde: partDesde, fecha_hasta: partHasta || null, porcentaje: pct, motivo: partMotivo || null,
      })
      if (error) { reporte.push({ hoja: 'provincias', fila: r, error: `Participación: ${error.message}` }); continue }
      participaciones++
    }

    if (regDesde && regPct) {
      const pct = celdaANumero(regPct)
      if (pct == null) { reporte.push({ hoja: 'provincias', fila: r, error: 'Regalía: % inválido' }); continue }
      const { error } = await db.from('regalias').insert({ concesion_id: conc.id, fecha_desde: regDesde, porcentaje: pct })
      if (error) { reporte.push({ hoja: 'provincias', fila: r, error: `Regalía: ${error.message}` }); continue }
      regalias++
    }
  }
  return { provincias, yacimientos: yacimientosN, participaciones, regalias }
}

async function procesarFormulasPrecio(db: ReturnType<typeof createSupabaseServerAdminClient>, ws: ExcelJS.Worksheet, reporte: { hoja: string; fila: number; error: string }[]) {
  // Cada bloque (petróleo/gas) se identifica por la columna "Unidad" (C):
  // "bbl" → petróleo/brent, "Mcf" → gas/henry_hub. Los parámetros de fórmula
  // (Descuento, DDE, Divisor, Extra, factor) se toman de la primera fila con
  // datos completos de cada bloque — se repiten igual en todas las filas del
  // Excel real, así que alcanza con leerlos una vez.
  type Bloque = { referencia: string; producto: 'petroleo' | 'gas'; puntos: { anio: number; precio: number }[]
    descuentoFijo?: number; divisor?: number; extra?: number; factor?: number; dde?: { min: number; pctMin: number; max: number; pctMax: number } }
  const bloques: Record<string, Bloque> = {}

  for (let r = 3; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const anio = celdaANumero(row.getCell(1).value)
    const precio = celdaANumero(row.getCell(2).value)
    const unidad = celdaATexto(row.getCell(3).value).trim().toLowerCase()
    if (anio == null || precio == null || anio < 1900 || anio > 2200) continue

    const esGas = unidad === 'mcf'
    const referencia = esGas ? 'henry_hub' : 'brent'
    const producto: 'petroleo' | 'gas' = esGas ? 'gas' : 'petroleo'
    if (!bloques[referencia]) bloques[referencia] = { referencia, producto, puntos: [] }
    bloques[referencia].puntos.push({ anio, precio })

    if (bloques[referencia].divisor == null) {
      const factor = celdaANumero(row.getCell(5).value)
      const descuentoFijo = celdaANumero(row.getCell(6).value)
      const divisor = celdaANumero(row.getCell(8).value)
      const extra = celdaANumero(row.getCell(9).value)
      const dde = extraerTramoDde(formulaTexto(ws, row.getCell(7).value))
      if (divisor != null) {
        bloques[referencia].factor = factor ?? undefined
        bloques[referencia].descuentoFijo = descuentoFijo ?? 0
        bloques[referencia].divisor = divisor
        bloques[referencia].extra = extra ?? 0
        bloques[referencia].dde = dde ?? undefined
      }
    }
  }

  if (Object.keys(bloques).length === 0) return { deck: null as string | null, puntos: 0, formulas: 0, avisos: [] as string[] }

  const avisos: string[] = []
  const nombreDeck = `Importado ${new Date().toISOString().slice(0, 10)}`
  const { data: deck, error: errDeck } = await db.from('price_decks')
    .insert({ nombre: nombreDeck, tipo: 'pronostico', descripcion: 'Cargado desde el Excel real del equipo técnico' })
    .select('id').single()
  if (errDeck) { reporte.push({ hoja: 'formulas_precio', fila: 0, error: `Price deck: ${errDeck.message}` }); return { deck: null, puntos: 0, formulas: 0, avisos } }

  let puntos = 0
  for (const b of Object.values(bloques)) {
    const filas = b.puntos.map(p => ({ price_deck_id: deck!.id, referencia: b.referencia, anio: p.anio, precio_usd: p.precio }))
    const { error } = await db.from('price_deck_puntos').insert(filas)
    if (error) { reporte.push({ hoja: 'formulas_precio', fila: 0, error: `Puntos de ${b.referencia}: ${error.message}` }); continue }
    puntos += filas.length
  }

  const { data: yacimientos } = await db.from('yacimientos').select('id, nombre')
  let formulas = 0
  for (const b of Object.values(bloques)) {
    if (b.divisor == null) {
      avisos.push(`No encontré los parámetros de fórmula (descuento/divisor/extra) para "${b.referencia}" — revisá esa fila a mano en "Fórmula de precio"`)
      continue
    }
    if (!b.dde) avisos.push(`No pude leer el tramo de DDE% por Brent para "${b.referencia}" desde la fórmula de Excel — completalo a mano en "Fórmula de precio"`)
    for (const yac of yacimientos ?? []) {
      const { error } = await db.from('formulas_precio').insert({
        yacimiento_id: yac.id, producto: b.producto, fecha_desde: '2000-01-01', referencia: b.referencia,
        descuento_fijo_usd: b.descuentoFijo ?? 0, divisor: b.divisor, descuento_adicional_usd: b.extra ?? 0,
        factor_m3_a_bbl: b.factor ?? undefined,
        dde_brent_min: b.dde?.min, dde_pct_min: b.dde?.pctMin, dde_brent_max: b.dde?.max, dde_pct_max: b.dde?.pctMax,
      })
      if (!error) formulas++
    }
  }

  return { deck: nombreDeck, puntos, formulas, avisos }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any)
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo — ¿es un .xlsx válido?' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const reporte: { hoja: string; fila: number; error: string }[] = []

  const wsProvincias = wb.getWorksheet('provincias')
  const resumen = wsProvincias ? await procesarProvincias(db, wsProvincias, reporte) : null

  const wsFormulas = wb.getWorksheet('formulas_precio')
  const precios = wsFormulas ? await procesarFormulasPrecio(db, wsFormulas, reporte) : null

  if (!wsProvincias && !wsFormulas) {
    return NextResponse.json({ error: 'El archivo no tiene ninguna hoja "provincias" ni "formulas_precio"' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, resumen, precios, reporte })
}
