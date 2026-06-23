import { NextResponse } from 'next/server'

export function dbError(err: { message?: string } | unknown, status = 500): NextResponse {
  const detail = err instanceof Error ? err.message : String(err)
  console.error('[api]', detail)
  return NextResponse.json({ error: 'Error interno del servidor' }, { status })
}
