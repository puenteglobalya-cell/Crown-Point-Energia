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

export class MultiGrupoError extends Error {
  grupos: string[]
  constructor(grupos: string[]) {
    super(`Este archivo tiene la curva abierta por yacimiento (${grupos.join(', ')}) — elegí cuál importar.`)
    this.grupos = grupos
  }
}

const esPet = (v: string) => v.startsWith('pet')
const esGas = (v: string) => v.startsWith('gas')
const esDias = (v: string) => v === 'días' || v === 'dias'

// Busca, en las primeras 20 filas, una fila con una celda "Fecha" y, cerca
// de ella, columnas etiquetadas "Pet"/"Gas" (con o sin unidad al lado, ej.
// "Pet (m3/d)"). Se acepta que la etiqueta esté en la misma fila que "Fecha"
// o una fila arriba — este segundo caso es el típico de reportes con header
// de dos niveles: una fila de grupo ("Curva Base", "Perforación"...), la
// fila siguiente con "Pet"/"Gas"/"Agua" bajo cada grupo, y recién debajo la
// fila con "Fecha" y las unidades (m3/d).
//
// Cuando hay varios PARES Pet/Gas en la fila (ej. "Curva Base", "Perforación",
// "Workover", "Total"), se toma el PRIMERO de izquierda a derecha — por
// convención de estos reportes, la curva básica sin incrementales mezclados.
// Cuando en cambio la fila de "Fecha" tiene una etiqueta de texto (no
// numérica) debajo de cada Pet/Gas — ej. "ET", "LT_PQO" — es la apertura por
// yacimiento del mismo grupo, no grupos distintos: ahí hace falta que el
// que llama elija cuál yacimiento con el parámetro `grupo`.
function detectarColumnas(ws: ExcelJS.Worksheet, grupoElegido?: string): { filaFecha: number; colFecha: number; colDias: number | null; colPet: number; colGas: number } {
  for (let r = 1; r <= 20; r++) {
    for (let c = 1; c <= 20; c++) {
      if (norm(get(ws, r, c)) !== 'fecha') continue
      const filaFecha = r
      const colFecha = c
      const petCols: { col: number; label: string }[] = []
      const gasCols: { col: number; label: string }[] = []
      let colDias: number | null = null
      for (let cc = 1; cc <= 40; cc++) {
        if (cc === colFecha) continue
        const mismaFila = norm(get(ws, r, cc))
        const filaArriba = norm(get(ws, r - 1, cc))
        if (esPet(mismaFila) || esPet(filaArriba)) petCols.push({ col: cc, label: mismaFila })
        else if (esGas(mismaFila) || esGas(filaArriba)) gasCols.push({ col: cc, label: mismaFila })
        else if (colDias === null && (esDias(filaArriba) || esDias(mismaFila))) colDias = cc
      }
      if (petCols.length === 0 || gasCols.length === 0) continue

      // Un solo par: comportamiento de siempre, sin pedir nada.
      if (petCols.length === 1) {
        return { filaFecha, colFecha, colDias, colPet: petCols[0].col, colGas: gasCols[0].col }
      }

      // Varios pares con etiqueta de yacimiento en la fila de Fecha (no es
      // "pet"/"gas" ni una fecha) → apertura por yacimiento del mismo grupo.
      const etiquetas = petCols.map(p => p.label).filter(l => l !== '' && !esPet(l) && !esGas(l))
      if (etiquetas.length === petCols.length) {
        if (!grupoElegido) throw new MultiGrupoError(etiquetas)
        const idx = petCols.findIndex(p => p.label === norm(grupoElegido))
        if (idx === -1) throw new Error(`No encontré el yacimiento "${grupoElegido}" — las columnas disponibles son: ${etiquetas.join(', ')}`)
        return { filaFecha, colFecha, colDias, colPet: petCols[idx].col, colGas: gasCols[idx].col }
      }

      // Varios grupos distintos (Curva Base, Perforación...) sin etiqueta de
      // yacimiento: se toma el primero, como siempre.
      return { filaFecha, colFecha, colDias, colPet: petCols[0].col, colGas: gasCols[0].col }
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

export async function parseCurvaExcel(file: File, grupoElegido?: string): Promise<CurvaMes[]> {
  const buffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('El archivo no tiene hojas')

  const { filaFecha, colFecha, colDias, colPet, colGas } = detectarColumnas(ws, grupoElegido)

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
