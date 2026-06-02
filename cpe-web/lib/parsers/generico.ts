import * as XLSX from 'xlsx'

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

export async function parsearExcelGenerico(
  file: File,
  tipo: 'produccion' | 'financiero',
): Promise<DatosGenerico> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  const hojas: HojaGenerica[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as unknown[][]

    if (!raw || raw.length === 0) continue

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

    if (filas.length > 0) hojas.push({ nombre: sheetName, headers, filas })
  }

  if (hojas.length === 0) throw new Error('No se encontraron datos en el archivo')

  // Derive period from filename  e.g. "Produccion_May-26.xlsx" → "May-26"
  const base = file.name.replace(/\.[^.]+$/, '')
  const periodMatch = base.match(/[A-Za-z]{3}[-_]\d{2,4}$/) ?? base.match(/\d{4}[-_]\d{2}$/)
  const periodo = periodMatch ? periodMatch[0].replace('_', '-') : base.slice(0, 40)

  return { tipo, periodo, titulo_archivo: file.name, hojas }
}
