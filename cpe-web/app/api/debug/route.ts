import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  const adminEmails = (process.env.CMS_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  let userEmail: string | null = null
  let authError: string | null = null
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    userEmail = user?.email ?? null
    if (error) authError = error.message
  } catch (e) { authError = String(e) }
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ set' : '✗ missing',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ set' : '✗ missing',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ set' : '✗ missing',
    adminEmails,
    currentUser: userEmail,
    isAdmin: userEmail ? adminEmails.includes(userEmail) : false,
    authError,
  })
}
