import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { createSupabaseServerAdminClient } from '@/lib/supabase'
import { getRpID, getOrigin, CHALLENGE_COOKIE } from '@/lib/webauthn'
import { isSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const expectedChallenge = req.cookies.get(CHALLENGE_COOKIE)?.value
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge expirado, intentá de nuevo' }, { status: 400 })
  }

  const { response } = await req.json()
  const db = createSupabaseServerAdminClient()

  const { data: cred } = await db
    .from('webauthn_credentials')
    .select('*')
    .eq('credential_id', response?.id)
    .maybeSingle()

  if (!cred) return NextResponse.json({ error: 'Llave de acceso no reconocida' }, { status: 400 })

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpID(req),
      credential: {
        id: cred.credential_id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: cred.counter,
        transports: cred.transports ?? undefined,
      },
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar la llave de acceso' }, { status: 400 })
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
  }

  await db
    .from('webauthn_credentials')
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq('id', cred.id)

  const { data: userData, error: userError } = await db.auth.admin.getUserById(cred.user_id)
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Passkey verification already proved possession + (usually) biometric
  // user-verification, so we mint a one-time magiclink token server-side and
  // hand it to the client to exchange for a session — no email is sent.
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  })
  if (linkError || !linkData.properties?.hashed_token) {
    return NextResponse.json({ error: 'No se pudo iniciar sesión' }, { status: 500 })
  }

  const res = NextResponse.json({
    email: userData.user.email,
    tokenHash: linkData.properties.hashed_token,
  })
  res.cookies.delete(CHALLENGE_COOKIE)
  return res
}
