import ExcelJS from 'exceljs'
import { NextResponse } from 'next/server'

// Declarative column spec for a styled, correctly-typed .xlsx export.
// Real cell types (date / number / text) are what make Excel keep formats:
// dates sort and filter as dates, phones/IDs stay text (no dropped leading
// zeros or "+", no scientific notation), and headers get a styled frozen row.
export type XlsxCol<T> = {
  header: string
  width?: number
  type?: 'text' | 'date' | 'number'
  get: (row: T) => unknown
}

const DATE_FMT = 'dd/mm/yyyy hh:mm'

function toDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

export async function buildXlsxResponse<T>(opts: {
  sheetName: string
  columns: XlsxCol<T>[]
  rows: T[]
  filename: string
}): Promise<NextResponse> {
  const { sheetName, columns, rows, filename } = opts
  const wb = new ExcelJS.Workbook()
  wb.created = new Date()
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] })

  // Header row
  ws.addRow(columns.map(c => c.header))
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.alignment = { vertical: 'middle' }
  header.height = 20
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2566' } }
  })

  // Column widths + per-column type formatting
  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1)
    col.width = c.width ?? 18
    if (c.type === 'date') col.numFmt = DATE_FMT
    else if (c.type === 'number') col.numFmt = '#,##0.00'
    else col.numFmt = '@' // text — Excel won't reinterpret phones/ids/emails
  })

  // Data rows with correct value types
  for (const row of rows) {
    const values = columns.map(c => {
      const raw = c.get(row)
      if (c.type === 'date') return toDate(raw)
      if (c.type === 'number') {
        const n = Number(raw)
        return Number.isFinite(n) ? n : null
      }
      return raw == null ? '' : String(raw)
    })
    ws.addRow(values)
  }

  // Autofilter over the whole table
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }

  const buf = await wb.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
