'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const WARNING_BEFORE_MS = 2 * 60 * 1000
const STORAGE_KEY = 'cpe_last_activity'

async function forceLogout() {
  localStorage.removeItem(STORAGE_KEY)
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/portal/login?expirada=1'
}

export default function SessionGuard() {
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(Math.round(WARNING_BEFORE_MS / 1000))
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function clearAll() {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }

    function scheduleFrom(remainingMs: number) {
      clearAll()
      const warnIn = Math.max(0, remainingMs - WARNING_BEFORE_MS)
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true)
        setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000))
        countdownRef.current = setInterval(() => {
          setSecondsLeft(s => Math.max(0, s - 1))
        }, 1000)
      }, warnIn)
      logoutTimerRef.current = setTimeout(forceLogout, remainingMs)
    }

    function resetTimer() {
      if (showWarning) return // ignore ambient activity while the warning is up — require explicit "extender"
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
      scheduleFrom(IDLE_TIMEOUT_MS)
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const elapsed = Date.now() - parseInt(stored, 10)
      if (elapsed >= IDLE_TIMEOUT_MS) {
        forceLogout()
        return
      }
      scheduleFrom(IDLE_TIMEOUT_MS - elapsed)
    } else {
      resetTimer()
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    return () => {
      clearAll()
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function extendSession() {
    setShowWarning(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(Math.round(WARNING_BEFORE_MS / 1000))
      countdownRef.current = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS)
    logoutTimerRef.current = setTimeout(forceLogout, IDLE_TIMEOUT_MS)
  }

  if (!showWarning) return null

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div
      role="alertdialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '26px 28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: 26, marginBottom: 10 }}>⏳</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>Tu sesión está por expirar</h3>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--fg-soft)' }}>
          Por inactividad, se va a cerrar tu sesión en
        </p>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--cp-negative, #C0392B)', marginBottom: 18 }}>
          {mm}:{ss}
        </div>
        <button
          onClick={extendSession}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '10px 18px' }}
        >
          Extender sesión
        </button>
      </div>
    </div>
  )
}
