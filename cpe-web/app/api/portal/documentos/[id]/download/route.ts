import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admin-auth'
import { decrypt, isEncrypted } from '@/lib/encryption'

const BUCKET = 'documents'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getPortalUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (isAdminEmail(user.email)) return { id: user.id }
  const db = createSupabaseServerAdminClient()
  const { data: roleRow } = await db.from('user_roles').select('activo').eq('user_id', user.id).single()
  if (!roleRow?.activo) return null
  return { id: user.id }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data: doc, error: docErr } = await db
    .from('documentos')
    .select('storage_path, file_name, encrypted')
    .eq('id', params.id)
    .single()

  if (docErr || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: blob, error: dlErr } = await db.storage
    .from(BUCKET)
    .download(doc.storage_path)

  if (dlErr || !blob) return NextResponse.json({ error: 'File unavailable' }, { status: 502 })

  let fileBuffer: Buffer<ArrayBufferLike> = Buffer.from(new Uint8Array(await blob.arrayBuffer()))

  if (doc.encrypted && isEncrypted(fileBuffer)) {
    try {
      fileBuffer = decrypt(fileBuffer)
    } catch {
      return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
    }
  }

  const ext = (doc.file_name ?? '').split('.').pop()?.toLowerCase() ?? ''
  const contentType = ext === 'pdf' ? 'application/pdf'
    : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/octet-stream'

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.file_name ?? 'documento')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
