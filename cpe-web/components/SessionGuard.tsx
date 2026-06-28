'use client'

import { useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// Hard session limit: 1 hour from login, regardless of activity.
// Applies only to portal users — admin layout does NOT include this component.
const SESSION_MAX_MS = 60 * 60 * 1000
const STORAGE_PREFIX = 'cpe_session_start_'

async function forceLogout(userId: string) {
  localStorage.removeItem(STORAGE_PREFIX + userId)
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/portal/login?expirada=1'
}

export default function SessionGuard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const key = STORAGE_PREFIX + user.id
      const stored = localStorage.getItem(key)
      const now    = Date.now()

      // First load after this login — set the session start timestamp
      const sessionStart = stored ? parseInt(stored, 10) : now
      if (!stored) localStorage.setItem(key, String(sessionStart))

      const remaining = SESSION_MAX_MS - (now - sessionStart)

      if (remaining <= 0) {
        // Already past 1 hour (e.g. tab was left open)
        forceLogout(user.id)
        return
      }

      timerRef.current = setTimeout(() => forceLogout(user.id), remaining)
    }

    init()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return null
}
