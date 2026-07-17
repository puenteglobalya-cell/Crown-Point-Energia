import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { getCurrentUserAndRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// Signed download for investor_documents — reachable by 'accionista' and
// 'admin' only (mirrors the accionista/admin read policy on the table
// itself). The storage bucket is private, so every download goes through
// this route rather than a public URL.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, role } = await getCurrentUserAndRole()
  if (!user || !role?.activo || !['accionista', 'admin'].includes(role.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createSupabaseServerAdminClient()
  const { data: doc } = await db.from('investor_documents').select('storage_path, file_name').eq('id', params.id).single()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await db.storage.from('investor-documents').createSignedUrl(doc.storage_path, 300)
  if (error || !data) return NextResponse.json({ error: 'Error al generar el enlace' }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
