import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getCurrentUserAndRole } from '@/lib/roles'
import { createSupabaseServerAdminClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { user, permissions } = await getCurrentUserAndRole()
  if (!user || !permissions.has('view_comercial')) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const desde = req.nextUrl.searchParams.get('desde')
  const hasta = req.nextUrl.searchParams.get('hasta')
  if (!desde || !hasta || !/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return NextResponse.json({ error: 'Parámetros desde/hasta inválidos (YYYY-MM-DD)' }, { status: 400 })
  }

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db
    .from('comercial_calendario_notas')
    .select('fecha, texto, hecho')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Calendario')
  ws.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Día', key: 'dia', width: 14 },
    { header: 'Nota', key: 'texto', width: 60 },
    { header: 'Hecho', key: 'hecho', width: 10 },
  ]
  ws.getRow(1).font = { bold: true }

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  for (const n of data ?? []) {
    const d = new Date(n.fecha + 'T00:00:00')
    ws.addRow({ fecha: n.fecha, dia: DIAS[d.getDay()], texto: n.texto, hecho: n.hecho ? 'Sí' : 'No' })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="calendario-comercial_${desde}_${hasta}.xlsx"`,
    },
  })
}
