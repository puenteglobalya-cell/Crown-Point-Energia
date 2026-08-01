import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { getRpID, CHALLENGE_COOKIE } from '@/lib/webauthn'
import { proteger } from '@/lib/proteccion'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Falta email' }, { status: 400 })

  // Public, pre-auth endpoint that triggers an admin.listUsers() call — rate
  // limit per IP so it can't be used to run up cost/load by hammering it.
  // Sized for many real users behind one shared office IP, same reasoning
  // as portal-login's limit.
  const guardia = await proteger(req, { nombre: 'webauthn-login-options', max: 40, ventanaMs: 5 * 60 * 1000 })
  if (!guardia.permitido) return guardia.respuesta

  const db = createSupabaseServerAdminClient()
  const { data: users } = await db.auth.admin.listUsers()
  const target = users.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase())

  // Same response whether the email exists or not, to avoid leaking which
  // emails have accounts / passkeys registered.
  let allowCredentials: { id: string }[] = []
  if (target) {
    const { data: creds } = await db
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', target.id)
    allowCredentials = (creds ?? []).map(c => ({ id: c.credential_id }))
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpID(req),
    allowCredentials: allowCredentials.length ? allowCredentials : undefined,
    userVerification: 'preferred',
  })

  const res = NextResponse.json({ options, hasPasskey: allowCredentials.length > 0 })
  res.cookies.set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 300, path: '/',
  })
  return res
}
