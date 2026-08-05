import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireReservasAccess } from '@/lib/reservas/access'
import { isSameOrigin } from '@/lib/csrf'
import { traerTodo } from '@/lib/reservas/engine'
import { parsearPegado, type CampoDestino } from '@/lib/reservas/pegarFilas'
import { ENTITIES } from '@/app/portal/(auth)/reservas/entityConfig'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Mismo tope que el resto de los uploads de la app (admin/reportes,
// cms/docs, admin/investor-documents) — sin esto, un archivo enorme (o un
// zip-bomb-style .xlsx) se pasaba directo a ExcelJS sin ningún chequeo antes
// de parsearlo.
const MAX_FILE_SIZE = 52_428_800 // 50 MB

type Opciones = Record<string, { id: unknown; nombre?: unknown }[]>

function celdaATexto(v: ExcelJS.CellValue): string {
  if (v == null) return ''
  if (v instanceof Date) {
    // Fecha "real" de Excel (el usuario tipeó algo que Excel autoconvirtió) —
    // se pasa a ISO en UTC para no correrse un día por huso horario.
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`
  }
  if (typeof v === 'object') {
    if ('text' in v && typeof (v as any).text === 'string') return (v as any).text
    if ('result' in v) return celdaATexto((v as any).result)
    if ('richText' in v) return (v as any).richText.map((r: any) => r.text).join('')
  }
  return String(v)
}

// Filas de datos de una hoja: arrancan en la 3 (1 = encabezado técnico, 2 =
// ayuda) — ver plantillaMasiva.ts, que arma exactamente este layout.
function leerFilas(ws: ExcelJS.Worksheet, nCampos: number): { numero: number; celdas: string[] }[] {
  const filas: { numero: number; celdas: string[] }[] = []
  for (let r = 3; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const celdas = Array.from({ length: nCampos }, (_, i) => celdaATexto(row.getCell(i + 1).value))
    if (celdas.every(c => c.trim() === '')) continue
    filas.push({ numero: r, celdas })
  }
  return filas
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireReservasAccess()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `El archivo pesa más de ${MAX_FILE_SIZE / 1024 / 1024} MB — partilo en tandas más chicas.` }, { status: 400 })
  }

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any)
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo — ¿es un .xlsx válido?' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()

  const tablasRef = [...new Set(ENTITIES.flatMap(e => e.fields.map(f => f.optionsFrom).filter(Boolean)))] as string[]
  const opcionesBase: Opciones = {}
  await Promise.all(tablasRef.map(async t => {
    opcionesBase[t] = await traerTodo<any>(() => db.from(t).select('id, nombre').order('id')).catch(() => [])
  }))

  type Preparado = { ent: typeof ENTITIES[number]; filas: { numero: number; valores: Record<string, unknown> }[] }

  // ─── Pasada 1: validar TODO sin escribir nada. Las filas nuevas de una
  // hoja se agregan a "opciones" con un id ficticio negativo, sólo para que
  // las hojas siguientes puedan resolver un nombre que se está cargando en
  // este mismo archivo — nunca se persiste.
  const reporte: { hoja: string; fila: number; error: string }[] = []
  const preparados: Preparado[] = []
  const opcionesSimuladas: Opciones = Object.fromEntries(Object.entries(opcionesBase).map(([k, v]) => [k, [...v]]))
  let ficticio = -1

  for (const ent of ENTITIES) {
    const ws = wb.getWorksheet(ent.tabla)
    if (!ws) continue
    const filas = leerFilas(ws, ent.fields.length)
    if (filas.length === 0) continue

    const texto = filas.map(f => f.celdas.join('\t')).join('\n')
    const resultado = parsearPegado(texto, ent.fields as CampoDestino[], opcionesSimuladas)

    const filasOk: { numero: number; valores: Record<string, unknown> }[] = []
    resultado.filas.forEach((f, i) => {
      if (f.errores.length > 0) reporte.push({ hoja: ent.title, fila: filas[i].numero, error: f.errores.join('; ') })
      else filasOk.push({ numero: filas[i].numero, valores: f.valores })
    })

    if (filasOk.length > 0) {
      preparados.push({ ent, filas: filasOk })
      if (ent.fields.some(f => f.name === 'nombre')) {
        opcionesSimuladas[ent.tabla] = [
          ...(opcionesSimuladas[ent.tabla] ?? []),
          ...filasOk.map(f => ({ id: ficticio--, nombre: f.valores.nombre })),
        ]
      }
    }
  }

  if (reporte.length > 0) {
    return NextResponse.json({ error: 'El archivo tiene errores — no se guardó nada.', reporte }, { status: 400 })
  }
  if (preparados.length === 0) {
    return NextResponse.json({ error: 'No hay filas para importar en ninguna hoja.' }, { status: 400 })
  }

  // ─── Pasada 2: ahora sí, insertar en el mismo orden, resolviendo cada hoja
  // contra los ids REALES que fueron quedando de las hojas anteriores de esta
  // misma corrida (no los ficticios de la pasada 1).
  const opcionesReales: Opciones = Object.fromEntries(Object.entries(opcionesBase).map(([k, v]) => [k, [...v]]))
  const insertadasPorTabla: Record<string, number> = {}

  for (const { ent, filas } of preparados) {
    const ws = wb.getWorksheet(ent.tabla)!
    const numeros = new Set(filas.map(f => f.numero))
    const celdasOk = leerFilas(ws, ent.fields.length).filter(f => numeros.has(f.numero))
    const texto = celdasOk.map(f => f.celdas.join('\t')).join('\n')
    const resultado = parsearPegado(texto, ent.fields as CampoDestino[], opcionesReales)
    const valores = resultado.filas.map(f => f.valores)

    const CHUNK = 500
    const idsNuevos: { id: unknown; nombre: unknown }[] = []
    for (let i = 0; i < valores.length; i += CHUNK) {
      const tanda = valores.slice(i, i + CHUNK)
      const { data, error } = await db.from(ent.tabla).insert(tanda).select('id')
      if (error) {
        return NextResponse.json({
          error: `Error inesperado al guardar "${ent.title}": ${error.message}. `
            + `Ya se habían guardado: ${Object.entries(insertadasPorTabla).map(([t, n]) => `${t} (${n})`).join(', ') || 'nada'}.`,
        }, { status: 500 })
      }
      data!.forEach((row, j) => idsNuevos.push({ id: row.id, nombre: (tanda[j] as any).nombre }))
    }

    insertadasPorTabla[ent.tabla] = valores.length
    if (ent.fields.some(f => f.name === 'nombre')) {
      opcionesReales[ent.tabla] = [...(opcionesReales[ent.tabla] ?? []), ...idsNuevos]
    }
  }

  return NextResponse.json({ ok: true, insertadasPorTabla, total: Object.values(insertadasPorTabla).reduce((a, b) => a + b, 0) })
}
