export interface ReserveCategory {
  category: string
  gross: number
  net: number
}

export interface SprouleReservesP1 {
  certifier: string
  asOfDate: string
  unit: 'MMboe'
  categories: ReserveCategory[]
}

export const SPROULE_P1_2024: SprouleReservesP1 = {
  certifier: 'Sproule Associates Limited',
  asOfDate: '2024-12-31',
  unit: 'MMboe',
  categories: [
    { category: 'Desarrolladas en Producción',      gross: 19.719, net: 16.703 },
    { category: 'Desarrolladas no en Producción',   gross:  9.343, net:  7.928 },
    { category: 'No Desarrolladas',                 gross:  7.934, net:  6.754 },
  ],
}

export function totalP1(data: SprouleReservesP1): ReserveCategory {
  const gross = data.categories.reduce((s, r) => s + r.gross, 0)
  const net   = data.categories.reduce((s, r) => s + r.net,   0)
  return { category: 'Total P1', gross: +gross.toFixed(3), net: +net.toFixed(3) }
}
