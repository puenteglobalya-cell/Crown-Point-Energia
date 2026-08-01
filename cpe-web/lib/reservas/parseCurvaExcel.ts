import ExcelJS from 'exceljs'

export type CurvaMes = { mes_offset: number; fecha: string; bbl_petroleo: number; mcf_gas: number }

const M3_TO_BBL = 6.2898
const M3_TO_FT3 = 35.3147

function cellVal(raw: ExcelJS.CellValue): unknown {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return raw
  if (raw instanceof Date) return raw
  if (typeof raw === 'object' && 'result' in (raw as object)) {
    return cellVal((raw as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue)
  }
  return null
}

function get(ws: ExcelJS.Worksheet, row: number, col: number): unknown {
  return cellVal(ws.getCell(row, col).value)
}

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase()
}

// Busca, en las primeras 20 filas, una fila con una celda "Fecha" y, cerca
// de ella, columnas etiquetadas "Pet" y "Gas" (en la fila inmediatamente
// superior, patrón típico de estos reportes con headers de 2 niveles).
function detectarColumnas(ws: ExcelJS.Worksheet): { filaFecha: number; colFecha: number; colDias: number | null; colPet: number; colGas: number } {
  for (let r = 1; r <= 20; r++) {
    for (let c = 1; c <= 20; c++) {
      if (norm(get(ws, r, c)) === 'fecha') {
        const filaFecha = r
        const colFecha = c
        let colPet = -1, colGas = -1, colDias: number | null = null
        for (let cc = 1; cc <= 15; cc++) {
          const abajo = norm(get(ws, r, cc))
          const arriba = norm(get(ws, r - 1, cc))
          if (abajo === 'pet' || abajo === 'petroleo' || abajo === 'petróleo') colPet = cc
          if (abajo === 'gas') colGas = cc
          if (abajo.includes('m3/d') && arriba === '' ) continue
          if (arriba === 'días' || arriba === 'dias' || abajo === 'días' || abajo === 'dias') colDias = cc
        }
        if (colPet === -1 || colGas === -1) continue
        return { filaFecha, colFecha, colDias, colPet, colGas }
      }
    }
  }
  throw new Error('No se encontró una fila con columnas "Fecha", "Pet" y "Gas" en las primeras 20 filas del archivo. Revisá el formato o pasame el archivo para ajustar el parser.')
}

// Días del mes leídos en UTC. ExcelJS devuelve las fechas a medianoche UTC, y
// este parser corre en el navegador: con getFullYear/getMonth (hora local), en
// Argentina (UTC-3) el 2026-03-01T00:00Z se lee como 28-feb y devolvía 28 días
// en lugar de 31 — un 10% de error en el volumen mensual de ese mes.
function daysInMonth(d: Date): number {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
}

export async function parseCurvaExcel(file: File): Promise<CurvaMes[]> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('El archivo no tiene hojas')

  const { filaFecha, colFecha, colDias, colPet, colGas } = detectarColumnas(ws)

  const filas: CurvaMes[] = []
  let mesOffset = 0
  // Se toleran huecos: antes la primera celda de fecha vacía cortaba la lectura,
  // así que una fila separadora en medio de la tabla truncaba la curva en
  // silencio (se importaban, por ejemplo, 60 de 240 meses). Ahora hacen falta
  // varias filas seguidas sin fecha para dar la tabla por terminada.
  const HUECOS_TOLERADOS = 5
  let huecos = 0
  for (let r = filaFecha + 1; r < filaFecha + 1 + 800; r++) {
    const fechaRaw = get(ws, r, colFecha)
    if (!(fechaRaw instanceof Date)) {
      if (filas.length > 0 && ++huecos > HUECOS_TOLERADOS) break
      continue
    }
    huecos = 0

    const dias = colDias !== null ? Number(get(ws, r, colDias)) || daysInMonth(fechaRaw) : daysInMonth(fechaRaw)
    const petM3d = Number(get(ws, r, colPet)) || 0
    const gasMm3d = Number(get(ws, r, colGas)) || 0

    filas.push({
      mes_offset: mesOffset,
      fecha: fechaRaw.toISOString().slice(0, 10),
      bbl_petroleo: Math.round(petM3d * dias * M3_TO_BBL * 1000) / 1000,
      mcf_gas: Math.round(gasMm3d * dias * M3_TO_FT3 * 1000) / 1000,
    })
    mesOffset++
  }

  if (filas.length === 0) throw new Error('No se encontraron filas de datos debajo del header "Fecha"')
  return filas
}
