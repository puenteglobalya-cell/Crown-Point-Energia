import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase'

// Generates a 7-day signed URL for a biblioteca document.
// Checks that the authenticated user actually has access to the document (via RLS query).
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user has access to this document via RLS (will return nothing if not allowed)
  const { data: doc } = await supabase
    .from('bib_documentos')
    .select('id')
    .eq('path', path)
    .single()

  if (!doc) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  // Generate a 7-day signed URL using service role
  const admin = createSupabaseServerAdminClient()
  const { data, error } = await admin.storage
    .from('biblioteca')
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'Error generando URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
