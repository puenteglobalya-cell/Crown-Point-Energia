'use client'

import { useEffect, useRef } from 'react'
import { HONEYPOT_FIELD, TIMESTAMP_FIELD } from '@/lib/antispam'

// Hidden anti-bot fields for public forms. Renders a honeypot input (humans
// never see or fill it) and a render-timestamp input (set after mount to avoid
// SSR hydration mismatch). Parent forms read them by name, so no props needed.
export default function HoneypotFields() {
  const tsRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tsRef.current) tsRef.current.value = String(Date.now())
  }, [])

  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        No completar este campo
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
      <input ref={tsRef} type="hidden" name={TIMESTAMP_FIELD} defaultValue="" />
    </div>
  )
}
