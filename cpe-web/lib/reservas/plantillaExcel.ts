import ExcelJS from 'exceljs'
import type { EntityConfig, FieldConfig } from '@/app/portal/(auth)/reservas/entityConfig'

// ─── Plantilla de Excel para pegado masivo ───────────────────────────────
// El pegado desde Excel (pegarFilas.ts) evita cargar de a un registro, pero
// alguien tiene que armar esa planilla desde cero cada vez — y adivinar el
// nombre de columna correcto, o si un campo va con id o con nombre, es
// exactamente el tipo de error que el parser después tiene que explicar uno
// por uno. Con una plantilla que ya trae el encabezado correcto y, para los
// campos que apuntan a otra tabla, una hoja con los valores que hoy existen
// para copiar, ese vaivén no hace falta.
//
// El encabezado usa el NAME de cada campo (no el label): es lo que
// detectarEncabezado en pegarFilas.ts matchea con puntaje máximo (h === n),
// así que la plantilla nunca depende de la heurística de prefijos — entra
// directo.

const AZUL = 'FF1F2566'
const GRIS = 'FFF2F2F5'

const TIPO_A_EJEMPLO: Record<FieldConfig['type'], unknown> = {
  text: '',
  number: 0,
  date: new Date().toISOString().slice(0, 10),
  select: '',
  checkbox: 'no',
}

export async function construirPlantillaExcel(
  cfg: EntityConfig,
  opciones: Record<string, { id: unknown; nombre?: unknown }[]>,
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Crown Point Energía — Simulador de reservas'
  wb.created = new Date()

  // ─── Hoja de datos ───────────────────────────────────────────────────
  const ws = wb.addWorksheet('Plantilla', { views: [{ state: 'frozen', ySplit: 2 }] })
  const columnas = cfg.fields.map(f => ({
    header: f.name,
    key: f.name,
    width: Math.max(16, f.label.length * 0.6, f.name.length + 4),
  }))
  ws.columns = columnas

  // Fila 1: encabezado real (lo que lee el parser). Fila 2: la etiqueta
  // humana y el tipo de dato, como referencia visual — el parser sólo lee la
  // fila 1 porque coincide exacto con el nombre del campo.
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
  head.height = 22

  const ayuda = ws.getRow(2)
  cfg.fields.forEach((f, i) => {
    const celda = ayuda.getCell(i + 1)
    const partes = [f.label]
    if (f.required) partes.push('· obligatorio')
    if (f.optionsFrom) partes.push(`· nombre de "${f.optionsFrom}" (ver hoja de opciones)`)
    if (f.staticOptions) partes.push(`· uno de: ${f.staticOptions.map(o => o.value).join(', ')}`)
    celda.value = partes.join(' ')
  })
  ayuda.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
  ayuda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }
  ayuda.height = 30
  ayuda.eachCell(c => { c.alignment = { wrapText: true, vertical: 'middle' } })

  // Una fila de ejemplo con valores de tipo correcto, fácil de pisar.
  const ejemplo = cfg.fields.map(f => {
    if (f.defaultValue !== undefined) return f.defaultValue
    if (f.staticOptions?.length) return f.staticOptions[0].value
    if (f.optionsFrom) return opciones[f.optionsFrom]?.[0]?.nombre ?? ''
    return TIPO_A_EJEMPLO[f.type]
  })
  const filaEjemplo = ws.addRow(ejemplo)
  filaEjemplo.font = { italic: true, color: { argb: 'FF9CA3AF' } }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } }

  // ─── Hoja de opciones válidas, una por campo con optionsFrom ─────────
  const camposConOpciones = cfg.fields.filter(f => f.optionsFrom)
  if (camposConOpciones.length > 0) {
    const wsOp = wb.addWorksheet('Opciones válidas')
    let col = 1
    for (const f of camposConOpciones) {
      const filas = opciones[f.optionsFrom!] ?? []
      const c1 = wsOp.getCell(1, col)
      c1.value = `${f.name} (${f.optionsFrom})`
      c1.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
      filas.forEach((r, i) => {
        wsOp.getCell(i + 2, col).value = String(r.nombre ?? r.id ?? '')
      })
      wsOp.getColumn(col).width = Math.max(20, f.name.length + 6)
      col++
    }
    if (camposConOpciones.every(f => (opciones[f.optionsFrom!] ?? []).length === 0)) {
      wsOp.getCell(3, 1).value = 'Todavía no hay nada cargado en esas tablas — cargalas primero y volvé a descargar la plantilla para ver las opciones acá.'
      wsOp.getCell(3, 1).font = { italic: true, color: { argb: 'FF6B7280' } }
    }
  }

  return wb.xlsx.writeBuffer()
}
