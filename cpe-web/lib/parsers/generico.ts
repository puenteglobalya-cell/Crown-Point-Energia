import ExcelJS from 'exceljs'

export interface HojaGenerica {
  nombre: string
  headers: string[]
  filas: (string | number | null)[][]
}

export interface DatosGenerico {
  tipo: 'produccion' | 'financiero'
  periodo: string
  titulo_archivo: string
  hojas: HojaGenerica[]
}

// ---------------------------------------------------------------------------
// ExcelJS cell value → plain JS value
// ---------------------------------------------------------------------------
function cellVal(raw: ExcelJS.CellValue): unknown {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return raw
  if (raw instanceof Date) return raw
  if (typeof raw === 'object' && 'result' in (raw as object)) {
    return cellVal((raw as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue)
  }
  if (typeof raw === 'object' && 'richText' in (raw as object)) {
    return (raw as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('')
  }
  if (typeof raw === 'object' && 'text' in (raw as object)) {
    return (raw as ExcelJS.CellHyperlinkValue).text
  }
  return String(raw)
}

// Build a 0-indexed grid (r[0]=colA) from an ExcelJS worksheet,
// skipping completely blank rows (blankrows: false equivalent).
function worksheetToGrid(ws: ExcelJS.Worksheet): unknown[][] {
  const grid: unknown[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals = row.values as ExcelJS.CellValue[]
    const lastCol = vals.length - 1  // 1-based last index
    const r: unknown[] = []
    for (let c = 1; c <= lastCol; c++) {
      r.push(cellVal(vals[c] ?? null))
    }
    // Only add rows that have at least one non-null value
    if (r.some(v => v !== null && v !== '' && v !== undefined)) {
      grid.push(r)
    }
  })
  return grid
}

export async function parsearExcelGenerico(
  file: File,
  tipo: 'produccion' | 'financiero',
): Promise<DatosGenerico> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)

  const hojas: HojaGenerica[] = []

  wb.eachSheet((ws) => {
    const raw = worksheetToGrid(ws)

    if (!raw || raw.length === 0) return

    // Find first row with content as headers
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(raw.length, 10); i++) {
      const nonEmpty = raw[i].filter(c => c !== null && c !== '' && c !== undefined)
      if (nonEmpty.length >= 2) { headerRowIdx = i; break }
    }

    const headers = (raw[headerRowIdx] ?? []).map(c => {
      if (c === null || c === undefined) return ''
      if (c instanceof Date) return c.toLocaleDateString('es-AR')
      return String(c)
    })

    const filas: (string | number | null)[][] = []
    for (let i = headerRowIdx + 1; i < raw.length; i++) {
      const row = raw[i]
      const hasContent = row.some(c => c !== null && c !== '' && c !== undefined)
      if (!hasContent) continue
      const mapped = row.map(c => {
        if (c === null || c === undefined || c === '') return null
        if (c instanceof Date) return c.toLocaleDateString('es-AR')
        if (typeof c === 'number') return c
        return String(c)
      })
      // Trim trailing nulls but keep row
      while (mapped.length > 0 && mapped[mapped.length - 1] === null) mapped.pop()
      if (mapped.length > 0) filas.push(mapped)
    }

    if (filas.length > 0) hojas.push({ nombre: ws.name, headers, filas })
  })

  if (hojas.length === 0) throw new Error('No se encontraron datos en el archivo')

  // Derive period from filename  e.g. "Produccion_May-26.xlsx" → "May-26"
  const base = file.name.replace(/\.[^.]+$/, '')
  const periodMatch = base.match(/[A-Za-z]{3}[-_]\d{2,4}$/) ?? base.match(/\d{4}[-_]\d{2}$/)
  const periodo = periodMatch ? periodMatch[0].replace('_', '-') : base.slice(0, 40)

  return { tipo, periodo, titulo_archivo: file.name, hojas }
}
