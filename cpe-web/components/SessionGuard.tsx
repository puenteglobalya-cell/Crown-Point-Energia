'use client'

import { useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const STORAGE_KEY = 'cpe_last_activity'

async function forceLogout() {
  localStorage.removeItem(STORAGE_KEY)
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/portal/login?expirada=1'
}

export default function SessionGuard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function resetTimer() {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(forceLogout, IDLE_TIMEOUT_MS)
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10)
      if (elapsed >= IDLE_TIMEOUT_MS) {
        forceLogout()
        return
      }
      timerRef.current = setTimeout(forceLogout, IDLE_TIMEOUT_MS - elapsed)
    } else {
      resetTimer()
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [])

  return null
}
