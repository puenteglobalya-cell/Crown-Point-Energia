// Tipos y cálculos para el seguimiento de fletes de exportación
// (Escalante/Medanito FOB) -- /portal/comercial/fletes.

export interface PrecioDiario {
  fecha: string
  iceBrent: number | null
  medanito: number | null
  escalanteFob: number | null
  laBrentFuturesStrip: number | null
}

export interface Cargamento {
  id: string
  fechaBl: string
  puerto: string
  crudo: 'Escalante' | 'Medanito'
  volumenBbl: number
  comprador: string | null
  destino: string | null
  buque: string | null
  clase: 'Aframax' | 'Suezmax' | 'otra'
  precioFobUsdBbl: number | null
  descuentoPactadoUsdBbl: number | null
  notas: string | null
}

export interface Flete {
  id: string
  cargamentoId: string
  tipo: 'spot' | 'time_charter'
  tarifaWs: number | null
  tarifaLumpSumUsd: number | null
  flatRateUsado: number | null
  costoTotalUsd: number
  demorasUsd: number
  combustibleUsd: number
  canalOtrosUsd: number
  proveedorBroker: string | null
}

export interface ReferenciaMercado {
  id: string
  fecha: string
  ruta: string
  clase: 'Aframax' | 'Suezmax' | 'otra'
  tarifaWs: number | null
  tarifaUsdTon: number | null
  tarifaUsdBbl: number | null
  fuente: string | null
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | null

export interface CargamentoConMetricas {
  cargamento: Cargamento
  flete: Flete | null
  fleteUsdBbl: number | null
  fleteMercadoUsdBbl: number | null
  desvioUsdBbl: number | null
  desvioPct: number | null
  semaforo: Semaforo
  brentDelDia: number | null
  precioOtroCrudoDelDia: number | null // Medanito si crudo=Escalante, y viceversa
  spreadBrentFob: number | null
  spreadCalidadUsdBbl: number | null
  spreadResiduoUsdBbl: number | null
  avisos: string[]
}

export function costoTotalFlete(f: Pick<Flete, 'costoTotalUsd' | 'demorasUsd' | 'combustibleUsd' | 'canalOtrosUsd'>): number {
  return f.costoTotalUsd + f.demorasUsd + f.combustibleUsd + f.canalOtrosUsd
}

export function calcularSemaforo(desvioPctAbs: number | null, umbralVerde: number, umbralAmarillo: number): Semaforo {
  if (desvioPctAbs == null) return null
  if (desvioPctAbs <= umbralVerde) return 'verde'
  if (desvioPctAbs <= umbralAmarillo) return 'amarillo'
  return 'rojo'
}

// Referencia de mercado más cercana en fecha para la misma ruta (puerto) y
// clase de buque, con tarifa en US$/bbl cargada -- sin esa referencia no
// hay con qué comparar y las métricas de desvío quedan en null con aviso,
// nunca se estima.
export function referenciaMasCercana(
  referencias: ReferenciaMercado[], puerto: string, clase: string, fecha: string
): ReferenciaMercado | null {
  const candidatas = referencias.filter(r => r.ruta === puerto && r.clase === clase && r.tarifaUsdBbl != null)
  if (candidatas.length === 0) return null
  const fechaMs = new Date(fecha + 'T00:00:00').getTime()
  return candidatas.reduce((mejor, r) => {
    const diff = Math.abs(new Date(r.fecha + 'T00:00:00').getTime() - fechaMs)
    const diffMejor = Math.abs(new Date(mejor.fecha + 'T00:00:00').getTime() - fechaMs)
    return diff < diffMejor ? r : mejor
  })
}

export function calcularMetricas(
  cargamento: Cargamento,
  flete: Flete | null,
  precioDelDia: PrecioDiario | null,
  referencias: ReferenciaMercado[],
  config: { umbralVerdePct: number; umbralAmarilloPct: number }
): CargamentoConMetricas {
  const avisos: string[] = []

  const fleteUsdBbl = flete ? costoTotalFlete(flete) / cargamento.volumenBbl : null
  if (!flete) avisos.push('Sin flete cargado para este cargamento.')

  const referencia = referenciaMasCercana(referencias, cargamento.puerto, cargamento.clase, cargamento.fechaBl)
  const fleteMercadoUsdBbl = referencia?.tarifaUsdBbl ?? null
  if (!referencia) avisos.push('Sin referencia de mercado (US$/bbl) para esa ruta/clase/fecha.')

  let desvioUsdBbl: number | null = null
  let desvioPct: number | null = null
  let semaforo: Semaforo = null
  if (fleteUsdBbl != null && fleteMercadoUsdBbl != null && fleteMercadoUsdBbl !== 0) {
    desvioUsdBbl = fleteUsdBbl - fleteMercadoUsdBbl
    desvioPct = (desvioUsdBbl / fleteMercadoUsdBbl) * 100
    semaforo = calcularSemaforo(Math.abs(desvioPct), config.umbralVerdePct, config.umbralAmarilloPct)
  }

  const brentDelDia = precioDelDia?.iceBrent ?? null
  if (!precioDelDia || brentDelDia == null) avisos.push('Sin precio de Brent cargado para la fecha de B/L.')

  const precioPropio = cargamento.crudo === 'Escalante' ? precioDelDia?.escalanteFob : precioDelDia?.medanito
  const precioOtroCrudoDelDia = cargamento.crudo === 'Escalante' ? (precioDelDia?.medanito ?? null) : (precioDelDia?.escalanteFob ?? null)

  let spreadBrentFob: number | null = null
  if (brentDelDia != null && cargamento.precioFobUsdBbl != null) {
    spreadBrentFob = brentDelDia - cargamento.precioFobUsdBbl
  } else if (!cargamento.precioFobUsdBbl) {
    avisos.push('Sin precio FOB realizado cargado para este cargamento.')
  }

  let spreadCalidadUsdBbl: number | null = null
  if (precioPropio != null && precioOtroCrudoDelDia != null) {
    spreadCalidadUsdBbl = Math.abs((precioOtroCrudoDelDia as number) - (precioPropio as number))
  }

  let spreadResiduoUsdBbl: number | null = null
  if (spreadBrentFob != null && fleteUsdBbl != null && spreadCalidadUsdBbl != null) {
    spreadResiduoUsdBbl = spreadBrentFob - fleteUsdBbl - spreadCalidadUsdBbl
  }

  return {
    cargamento, flete, fleteUsdBbl, fleteMercadoUsdBbl, desvioUsdBbl, desvioPct, semaforo,
    brentDelDia, precioOtroCrudoDelDia, spreadBrentFob, spreadCalidadUsdBbl, spreadResiduoUsdBbl, avisos,
  }
}
