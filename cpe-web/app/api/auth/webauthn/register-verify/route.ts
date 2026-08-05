import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase'
import { getRpID, getOrigin, CHALLENGE_COOKIE } from '@/lib/webauthn'
import { dbError } from '@/lib/api-error'
import { isSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expectedChallenge = req.cookies.get(CHALLENGE_COOKIE)?.value
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'Challenge expirado, intentá de nuevo' }, { status: 400 })
  }

  const body = await req.json()
  const { response, deviceName } = body

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpID(req),
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar la llave de acceso' }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
  }

  const { credential } = verification.registrationInfo
  const db = createSupabaseServerAdminClient()
  const { error } = await db.from('webauthn_credentials').insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    device_name: deviceName ?? null,
  })

  if (error) return dbError(error)

  const res = NextResponse.json({ ok: true })
  res.cookies.delete(CHALLENGE_COOKIE)
  return res
}
