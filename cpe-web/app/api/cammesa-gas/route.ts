import { NextRequest, NextResponse } from 'next/server'
import { fetchConsumoGasCammesa } from '@/lib/cammesa-sync'

export const dynamic = 'force-dynamic'

// GET /api/cammesa-gas?periodo=YYYY-MM  -- consumo diario nacional de gas
// (Plan Gas) para ese mes, directo de la API pública de CAMMESA.
export async function GET(req: NextRequest) {
  const periodo = req.nextUrl.searchParams.get('periodo')
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: 'Falta ?periodo=YYYY-MM' }, { status: 400 })
  }
  const [anio, mes] = periodo.split('-').map(Number)
  const desde = `${periodo}-01`
  const ultimoDia = new Date(anio, mes, 0).getDate()
  const hasta = `${periodo}-${String(ultimoDia).padStart(2, '0')}`

  try {
    const puntos = await fetchConsumoGasCammesa(desde, hasta)
    return NextResponse.json({ puntos })
  } catch {
    return NextResponse.json({ error: 'CAMMESA unavailable' }, { status: 502 })
  }
}
