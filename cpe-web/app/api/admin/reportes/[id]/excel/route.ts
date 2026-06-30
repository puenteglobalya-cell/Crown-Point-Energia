import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admin-auth'
import { getPermissionsForRole } from '@/lib/roles'
import { canAccessReport } from '@/lib/report-access'
import ExcelJS from 'exceljs'
import type { DatosIngresos } from '@/lib/parsers/ingresos'

async function getUserWithRole() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isAdminEmail(user.email)) return { id: user.id, email: user.email, role: 'admin' as const, activo: true }
  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db.from('user_roles').select('role, activo').eq('user_id', user.id).single()
  if (!roleRow) return null
  return { id: user.id, email: user.email, role: roleRow.role as 'viewer' | 'uploader' | 'admin', activo: roleRow.activo }
}

function f2(n: number | null | undefined) { return n == null || isNaN(n as number) ? 0 : parseFloat((n as number).toFixed(2)) }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userWithRole = await getUserWithRole()
  if (!userWithRole?.activo) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data, error } = await db.from('reportes').select('titulo, periodo, estado, type_id, datos').eq('id', params.id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (data.estado !== 'publicado') {
    const permissions = await getPermissionsForRole(userWithRole.role)
    if (!permissions.has('view_drafts')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  // Object-level access (per-shareholder / per-type) — prevents IDOR
  if (!await canAccessReport(userWithRole.id, userWithRole.role, params.id, data.type_id ?? null)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const d = data.datos as DatosIngresos

  const wb = new ExcelJS.Workbook()

  // ── Sheet 1: Resumen ──────────────────────────────────────────────────────
  const wsResumen = wb.addWorksheet('Resumen')
  wsResumen.addRows([
    ['Reporte de Ingresos — Crown Point Energía'],
    ['Período', d.periodo],
    ['Mes', d.mes],
    ['Días', d.dias],
    [],
    ['INDICADORES CLAVE', ''],
    ['Ventas del período (us$ MM)', f2(d.ventas_MM)],
    ['Stock al cierre (us$ MM)', f2(d.stock_MM)],
    ['Vol. producido (boe/d)', f2(d.vol_producido_boed)],
    ['Vol. vendido (boe/d)', f2(d.vol_vendido_boed)],
    ['Precio neto petróleo (us$/bbl)', f2(d.precio_neto_oil)],
    ['Precio neto gas (us$/Mcf)', f2(d.precio_neto_gas)],
    ['Brent promedio (us$/bbl)', f2(d.brent_prom)],
    ['Medanito promedio (us$/bbl)', f2(d.medanito_prom)],
    ['Mix producción petróleo (%)', f2(d.oil_pct_prod)],
    ['Mix producción gas (%)', f2(d.gas_pct_prod)],
    ['Mix ventas petróleo (%)', f2(d.oil_pct_vend)],
    ['Mix ventas gas (%)', f2(d.gas_pct_vend)],
  ])

  // ── Sheet 2: Áreas Petróleo ───────────────────────────────────────────────
  const wsAreas = wb.addWorksheet('Petróleo por área')
  wsAreas.addRow(['Área', 'Prod. 100% (m³/d)', 'Prod. neta (m³/d)', 'Entregados (m³)', 'Vol. (bbl)', 'Precio neto (us$/bbl)', 'Ingreso (us$)', 'Stock (m³)', 'Stock (días)', 'Stock (us$)', 'Brent ref.', 'Descuento (us$)'])
  for (const [nombre, a] of Object.entries(d.areas)) {
    wsAreas.addRow([
      nombre,
      f2(a.prod_100_m3d), f2(a.prod_neta_m3d), f2(a.entregados_m3),
      f2(a.vol_bbl), f2(a.precio_neto), f2(a.ingreso),
      f2(a.stock_m3), f2(a.stock_dias), f2(a.stock_us),
      f2(a.brent_ref), f2(a.descuento),
    ])
  }

  // ── Sheet 3: Gas ──────────────────────────────────────────────────────────
  const wsGas = wb.addWorksheet('Gas por área')
  wsGas.addRow(['Área', 'Prod. (Mcf/d)', 'Vol. mes (Mcf)', 'Precio (us$/Mcf)', 'Ingreso (us$)'])
  for (const [nombre, g] of Object.entries(d.gas)) {
    wsGas.addRow([nombre, f2(g.prod_mcfd), f2(g.vol_mes_mcf), f2(g.precio_mcf), f2(g.ingreso)])
  }

  // ── Sheet 4: Histórico mensual (si existe) ────────────────────────────────
  if (d.mensual_historico && d.mensual_historico.length > 0) {
    const wsHist = wb.addWorksheet('Histórico mensual')
    wsHist.addRow(['Mes', 'Total (us$ MM)', 'ET (us$ MM)', 'PCKK (us$ MM)', 'CH (us$ MM)', 'RCLV (us$ MM)', 'Gas (us$ MM)', 'Precio ET (us$/bbl)', 'Precio PCKK', 'Precio CH', 'Precio RCLV'])
    for (const h of d.mensual_historico) {
      wsHist.addRow([
        h.mes, f2(h.total_MM), f2(h.ET_MM), f2(h.PCKK_MM), f2(h.CH_MM), f2(h.RCLV_MM), f2(h.gas_MM),
        f2(h.precio_ET), f2(h.precio_PCKK), f2(h.precio_CH), f2(h.precio_RCLV),
      ])
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  const filename = `CPE-Ingresos-${d.periodo.replace(/[^a-zA-Z0-9-]/g, '_')}.xlsx`

  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
