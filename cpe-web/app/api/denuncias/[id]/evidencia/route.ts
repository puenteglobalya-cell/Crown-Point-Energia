import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { requireComplianceUser } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireComplianceUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data: d } = await db.from('denuncias_etica').select('evidencia_path').eq('id', params.id).single()
  if (!d?.evidencia_path) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await db.storage.from('denuncias-evidencia').createSignedUrl(d.evidencia_path, 300)
  if (error || !data) return NextResponse.json({ error: 'Error al generar el enlace' }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
