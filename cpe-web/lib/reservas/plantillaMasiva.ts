import ExcelJS from 'exceljs'
import { ENTITIES } from '@/app/portal/(auth)/reservas/entityConfig'

// ─── Plantilla de Excel para la carga inicial completa ───────────────────
// La versión "de a una tabla" (plantillaExcel.ts) sigue existiendo para
// correcciones puntuales. Ésta arma las 28 hojas de una — el orden es el
// mismo en que import-masivo/route.ts las procesa, porque una concesión
// necesita que su yacimiento ya exista, un pozo necesita su concesión, etc.
//
// Encabezado (fila 1) = field.name, igual que en plantillaExcel.ts, para que
// el mismo parser de pegado (pegarFilas.ts) los lea sin heurística. Fila 2 =
// ayuda humana. Los datos arrancan en la fila 3 — import-masivo/route.ts
// asume exactamente este layout, así que si cambia acá hay que cambiar allá.

const AZUL = 'FF1F2566'
const GRIS = 'FFF2F2F5'

export async function construirPlantillaMasiva(
  opcionesExistentes: Record<string, { id: unknown; nombre?: unknown }[]>,
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Crown Point Energía — Simulador de reservas'
  wb.created = new Date()

  const port = wb.addWorksheet('Instrucciones')
  port.getColumn(1).width = 105
  const instr = [
    'CROWN POINT ENERGÍA — Plantilla de carga inicial completa',
    '',
    '• Hay una hoja por tabla, en el orden en que hay que completarlas (no lo cambies): una concesión necesita',
    '  que su yacimiento ya exista en la hoja "yacimientos", un pozo necesita su concesión, etc.',
    '• Fila 1 = encabezado técnico, no la toques. Fila 2 = ayuda en español. Los datos van desde la fila 3.',
    '• Columnas marcadas "obligatorio" en la fila 2 no pueden quedar vacías en ninguna fila con datos.',
    '• Las columnas que apuntan a otra tabla (yacimiento_id, concesion_id, pozo_id…) se completan con el',
    '  NOMBRE del registro — el mismo que escribiste en la hoja de esa tabla — no con un número.',
    '  Podés referenciar tanto un nombre que ya existía en el sistema como uno nuevo que cargaste en la hoja',
    '  correspondiente de este mismo archivo.',
    '• Columnas de lista (Tipo, Categoría…) sólo aceptan uno de los valores que dice la ayuda de la fila 2.',
    '• Fechas: aaaa-mm-dd o dd/mm/aaaa. Casillas de sí/no: SI, NO, TRUE o 1.',
    '• Si una hoja no aplica todavía a tu operación, dejala vacía (sin filas desde la 3) — se ignora entera.',
    '• curvas_produccion: elegí pozo_id O pozo_tipo_id en cada fila, nunca los dos.',
    '',
    'Al subirla, el sistema valida las 28 hojas ANTES de guardar nada — si hay un error en cualquiera, no',
    'se carga ninguna, y te dice hoja + fila + qué está mal para que lo corrijas y la vuelvas a subir entera.',
  ]
  instr.forEach((line, i) => {
    const cell = port.getCell(i + 1, 1)
    cell.value = line
    if (i === 0) cell.font = { bold: true, size: 13 }
  })

  const tablasReferenciadas = [...new Set(ENTITIES.flatMap(e => e.fields.map(f => f.optionsFrom).filter(Boolean)))] as string[]
  const conDatos = tablasReferenciadas.filter(t => (opcionesExistentes[t] ?? []).length > 0)
  if (conDatos.length > 0) {
    const wsYa = wb.addWorksheet('Ya cargado')
    conDatos.forEach((t, col) => {
      const c1 = wsYa.getCell(1, col + 1)
      c1.value = t
      c1.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
      opcionesExistentes[t].forEach((r, i) => { wsYa.getCell(i + 2, col + 1).value = String(r.nombre ?? '') })
      wsYa.getColumn(col + 1).width = Math.max(20, t.length + 4)
    })
  }

  for (const ent of ENTITIES) {
    const ws = wb.addWorksheet(ent.tabla.slice(0, 31), { views: [{ state: 'frozen', ySplit: 2 }] })
    ws.columns = ent.fields.map(f => ({
      header: f.name, key: f.name,
      width: Math.max(16, f.label.length * 0.55, f.name.length + 4),
    }))

    const head = ws.getRow(1)
    head.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
    head.height = 20

    const ayuda = ws.getRow(2)
    ent.fields.forEach((f, i) => {
      const celda = ayuda.getCell(i + 1)
      const partes = [f.label]
      if (f.required) partes.push('· obligatorio')
      if (f.optionsFrom) partes.push(`· nombre de un registro de la hoja "${f.optionsFrom}"`)
      if (f.staticOptions) partes.push(`· uno de: ${f.staticOptions.map(o => o.value).join(', ')}`)
      if (f.type === 'checkbox') partes.push('· SI / NO')
      celda.value = partes.join(' ')
    })
    ayuda.font = { italic: true, size: 9, color: { argb: 'FF6B7280' } }
    ayuda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS } }
    ayuda.height = 32
    ayuda.eachCell(c => { c.alignment = { wrapText: true, vertical: 'middle' } })

    // Título arriba de todo, informativo — no forma parte del layout que lee el importador.
    ws.getCell(1, 1).note = ent.title + (ent.helpText ? `\n\n${ent.helpText}` : '')
  }

  return wb.xlsx.writeBuffer()
}
