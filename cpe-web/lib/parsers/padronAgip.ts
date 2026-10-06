import ExcelJS from 'exceljs'

export function normalizarCuit(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '')
}

export interface ClienteSap {
  cuit: string
  codigoSap: string
  razonSocial: string
}

// Lee la hoja "KNA1 - Cliente (general)" del export de SAP (Actualización
// en masa / consolidación) -- fila 1 tiene las etiquetas en español, fila 2
// los nombres técnicos de campo (KUNNR, STCD1, NAME1). Se busca por nombre
// técnico en vez de por posición fija, porque el orden de columnas puede
// cambiar entre exports.
export async function parsearClientesSapExcel(buffer: ArrayBuffer): Promise<ClienteSap[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)

  const ws = wb.worksheets.find(w => /KNA1/i.test(w.name))
  if (!ws) throw new Error('No se encontró la hoja KNA1 (Cliente general) en el Excel.')

  const codigosRow = ws.getRow(2).values as ExcelJS.CellValue[]
  const colOf = (campoTecnico: string): number => {
    for (let c = 1; c < codigosRow.length; c++) {
      if (String(codigosRow[c] ?? '').trim() === campoTecnico) return c
    }
    return -1
  }

  const colKunnr = colOf('KUNNR')
  const colStcd1 = colOf('STCD1')
  const colName1 = colOf('NAME1')
  if (colKunnr < 0 || colStcd1 < 0) {
    throw new Error('La hoja KNA1 no tiene las columnas KUNNR (código SAP) y/o STCD1 (CUIT) esperadas.')
  }

  const clientes: ClienteSap[] = []
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 2) return // encabezados
    const cuit = normalizarCuit(row.getCell(colStcd1).value)
    if (cuit.length < 10) return
    const codigoSap = String(row.getCell(colKunnr).value ?? '').trim()
    if (!codigoSap) return
    const razonSocial = colName1 > 0 ? String(row.getCell(colName1).value ?? '').trim() : ''
    clientes.push({ cuit, codigoSap, razonSocial })
  })
  return clientes
}

// ─── Padrón AGIP (agentes de percepción/retención de IIBB, CABA) ──────────
// Formato (sin encabezado, campos separados por ";"):
//  1 fecha de publicación (DDMMAAAA)   2 vigencia desde   3 vigencia hasta
//  4 CUIT                              5 carácter (C=Convenio Multilateral,
//    D=Directo/local -- a confirmar con AGIP)
//  6-7 flags (S/N, siempre constantes en los padrones vistos)
//  8 alícuota de percepción (%)        9 alícuota de retención (%)
//  10-11 código de agrupamiento (00 cuando no aplica)
//  12 razón social (a veces vacío)
export interface FilaPadronAgip {
  cuit: string
  caracter: string
  alicuotaPercepcion: number
  alicuotaRetencion: number
  vigenciaDesde: string
  vigenciaHasta: string
  nombre: string
}

function fechaDdmmaaaaAIso(v: string): string {
  if (!/^\d{8}$/.test(v)) return v
  return `${v.slice(4, 8)}-${v.slice(2, 4)}-${v.slice(0, 2)}`
}

function numeroDecimalCMode(v: string): number {
  const n = Number((v ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function parsearLineaPadronAgip(linea: string): FilaPadronAgip | null {
  if (!linea.trim()) return null
  const campos = linea.split(';')
  if (campos.length < 9) return null
  const cuit = normalizarCuit(campos[3])
  if (cuit.length < 10) return null
  return {
    cuit,
    caracter: (campos[4] ?? '').trim(),
    alicuotaPercepcion: numeroDecimalCMode(campos[7]),
    alicuotaRetencion: numeroDecimalCMode(campos[8]),
    vigenciaDesde: fechaDdmmaaaaAIso((campos[1] ?? '').trim()),
    vigenciaHasta: fechaDdmmaaaaAIso((campos[2] ?? '').trim()),
    nombre: (campos[11] ?? '').trim(),
  }
}

export interface MatchPadronAgip extends FilaPadronAgip {
  codigoSap: string
  razonSocialSap: string
}

// Recorre el padrón línea por línea (stream) sin cargarlo entero en memoria
// de una -- sólo conserva las líneas cuyo CUIT está en el padrón de clientes
// SAP ya cargado, así un archivo de millones de líneas no hace crecer la
// respuesta ni la memoria más allá de la cantidad real de clientes propios.
export async function buscarClientesEnPadron(
  stream: ReadableStream<Uint8Array>,
  clientesPorCuit: Map<string, ClienteSap>
): Promise<MatchPadronAgip[]> {
  const matches: MatchPadronAgip[] = []
  // El padrón de AGIP viene en ISO-8859-1 (Latin-1), no UTF-8 -- si se
  // decodifica como UTF-8 los nombres con tildes/Ñ quedan corruptos
  // ("COMPA�IA" en vez de "COMPAÑIA").
  const decoder = new TextDecoder('iso-8859-1')
  const reader = stream.getReader()
  let buffer = ''

  const procesarLinea = (linea: string) => {
    const fila = parsearLineaPadronAgip(linea)
    if (!fila) return
    const cliente = clientesPorCuit.get(fila.cuit)
    if (!cliente) return
    matches.push({ ...fila, codigoSap: cliente.codigoSap, razonSocialSap: cliente.razonSocial })
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) >= 0) {
      procesarLinea(buffer.slice(0, idx))
      buffer = buffer.slice(idx + 1)
    }
  }
  buffer += decoder.decode()
  if (buffer) procesarLinea(buffer)

  return matches
}
