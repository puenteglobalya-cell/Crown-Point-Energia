export type YacimientoPin = {
  id: string
  title: string
  subtitle: string
  commodity: 'oil' | 'gas' | 'mixed'
  lat: number
  lon: number
}

export const BLOCK_COORDS: Record<string, [number, number]> = {
  ppc:      [-35.20, -68.80],
  chanares: [-34.60, -67.80],
  cerro:    [-36.50, -69.00],
  tordillo: [-45.85, -67.54],
  piedra:   [-47.20, -68.60],
  tdf:      [-52.65, -68.60],
}
