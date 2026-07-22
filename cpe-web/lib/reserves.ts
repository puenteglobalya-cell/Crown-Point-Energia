export interface ReserveCategory {
  category: string
  gross: number
  net: number
}

export interface SprouleReserves2P {
  certifier: string
  asOfDate: string
  unit: 'MMboe'
  categories: ReserveCategory[]
}

export const SPROULE_2P_2025: SprouleReserves2P = {
  certifier: 'Sproule ERCE',
  asOfDate: '2025-12-31',
  unit: 'MMboe',
  categories: [
    { category: 'Total Probadas',           gross: 37.551, net: 31.849 },
    { category: 'Total Probables',          gross: 34.029, net: 28.909 },
  ],
}

export function totalReserves(data: SprouleReserves2P): ReserveCategory {
  const gross = data.categories.reduce((s, r) => s + r.gross, 0)
  const net   = data.categories.reduce((s, r) => s + r.net,   0)
  return { category: 'Total 2P', gross: +gross.toFixed(3), net: +net.toFixed(3) }
}
