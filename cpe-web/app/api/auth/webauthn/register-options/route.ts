import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase'
import { getRpID, RP_NAME, CHALLENGE_COOKIE } from '@/lib/webauthn'
import { isSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createSupabaseServerAdminClient()
  const { data: existing } = await db
    .from('webauthn_credentials')
    .select('credential_id')
    .eq('user_id', user.id)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(req),
    userName: user.email ?? user.id,
    attestationType: 'none',
    excludeCredentials: (existing ?? []).map(c => ({ id: c.credential_id })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  })

  const res = NextResponse.json(options)
  res.cookies.set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300, path: '/',
  })
  return res
}
