'use client'

import { useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes

// Logs out the portal user after 30 minutes of inactivity.
// Add to portal layout — no UI; runs silently in background.
export default function SessionGuard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut()
        window.location.href = '/portal/login'
      }, INACTIVITY_MS)
    }

    const events = ['click', 'keypress', 'scroll', 'mousemove', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [])

  return null
}
