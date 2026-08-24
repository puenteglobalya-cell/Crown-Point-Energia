// Consumo diario de gas -- API pública de CAMMESA (sin autenticación), nemo
// CONSUMO_GAS_PD_PLAN_GAS. El endpoint sólo acepta ventanas de <2 días, así que
// se pide un día a la vez. Devuelve el consumo total nacional (Mercado
// Eléctrico Mayorista) por día -- es un dato de contexto de mercado, no
// específico de CPE, igual que el Brent/Henry Hub.

export interface PuntoConsumoGasCammesa { fecha: string; consumo_m3: number }

const CAMMESA_URL = 'https://api.cammesa.com/pub-svc/public/especial/consumoGasPDPlanGas'

interface RegistroDiarioCammesa { fecha: string; totalMem?: number }

async function fetchDia(fecha: string): Promise<PuntoConsumoGasCammesa | null> {
  const desde = `${fecha}T00:00:00.000-03:00`
  const hastaDate = new Date(`${fecha}T00:00:00-03:00`)
  hastaDate.setDate(hastaDate.getDate() + 1)
  const hasta = hastaDate.toISOString().slice(0, 19) + '.000-03:00'

  const url = `${CAMMESA_URL}?fechadesde=${encodeURIComponent(desde)}&fechahasta=${encodeURIComponent(hasta)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const json = (await res.json()) as RegistroDiarioCammesa[]
  const registro = json.find(r => r.fecha === fecha) ?? json[0]
  if (!registro || typeof registro.totalMem !== 'number') return null
  return { fecha, consumo_m3: registro.totalMem }
}

// desde/hasta en formato YYYY-MM-DD (inclusive). No pide días futuros a la
// fecha de hoy porque CAMMESA todavía no publicó esa programación.
export async function fetchConsumoGasCammesa(desde: string, hasta: string): Promise<PuntoConsumoGasCammesa[]> {
  const hoy = new Date().toISOString().slice(0, 10)
  const dias: string[] = []
  const cur = new Date(`${desde}T00:00:00Z`)
  const fin = new Date(`${(hasta > hoy ? hoy : hasta)}T00:00:00Z`)
  while (cur <= fin) {
    dias.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }

  const puntos: PuntoConsumoGasCammesa[] = []
  const CONCURRENCIA = 5
  for (let i = 0; i < dias.length; i += CONCURRENCIA) {
    const lote = dias.slice(i, i + CONCURRENCIA)
    const resultados = await Promise.all(lote.map(d => fetchDia(d).catch(() => null)))
    for (const r of resultados) if (r) puntos.push(r)
  }
  return puntos.sort((a, b) => a.fecha.localeCompare(b.fecha))
}
