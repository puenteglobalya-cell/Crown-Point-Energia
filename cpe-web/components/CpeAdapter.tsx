'use client'

import { useEffect } from 'react'
import type { CMSState } from '@/lib/cms'

// Thin client-side adapter that exposes window.CPE using the SSR-applied
// state from <html data-*> attributes and the /api/cms/state endpoint.
// This preserves the window.CPE public API so the admin editor can work.
export default function CpeAdapter({ state }: { state: CMSState }) {
  useEffect(() => {
    // Redirect Supabase password-recovery links to the reset page
    if (window.location.hash.includes('type=recovery')) {
      window.location.replace('/admin/reset-password' + window.location.hash)
      return
    }
  }, [])

  useEffect(() => {
    let currentState: CMSState = structuredClone(state)

    function applyAll(s: CMSState) {
      const root = document.documentElement
      root.setAttribute('data-direction', s.direction)
      root.setAttribute('data-theme', s.theme)
      root.setAttribute('data-lang', s.lang)
      root.lang = s.lang

      // Apply section visibility
      document.querySelectorAll<HTMLElement>('[data-cpe-section]').forEach(el => {
        const key = el.getAttribute('data-cpe-section')!
        const visible = s.show[key] !== false
        el.style.display = visible ? '' : 'none'
        el.toggleAttribute('hidden', !visible)
      })

      // Apply field values
      document.querySelectorAll<HTMLElement>('[data-cpe-field]').forEach(el => {
        const key = el.getAttribute('data-cpe-field')!
        if (Object.prototype.hasOwnProperty.call(s.fields, key)) {
          const val = s.fields[key]
          const langEs = el.querySelector<HTMLElement>(':scope > .lang-es')
          const langEn = el.querySelector<HTMLElement>(':scope > .lang-en')
          if (langEs || langEn) {
            if (langEs) langEs.textContent = val
            if (langEn) langEn.textContent = val
          } else {
            el.textContent = val
          }
        }
      })

      // Fire listeners
      listeners.forEach(fn => { try { fn(s) } catch {} })
    }

    const listeners = new Set<(s: CMSState) => void>()

    window.CPE = {
      get state() { return JSON.parse(JSON.stringify(currentState)) },
      set(patch: Partial<CMSState>) {
        currentState = deepMerge(currentState, patch) as CMSState
        applyAll(currentState)
        // Persist to Supabase when in admin context
        fetch('/api/cms/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }).catch(() => {})
      },
      setField(key: string, value: string) {
        this.set({ fields: { [key]: value } } as Partial<CMSState>)
      },
      setShow(key: string, visible: boolean) {
        this.set({ show: { [key]: !!visible } } as Partial<CMSState>)
      },
      on(fn: (s: CMSState) => void) {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
      off(fn: (s: CMSState) => void) { listeners.delete(fn) },
      export() { return JSON.stringify(currentState, null, 2) },
      reset() {
        fetch('/api/cms/state').then(r => r.json()).then((s: CMSState) => {
          currentState = s
          applyAll(currentState)
        }).catch(() => {})
      },
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

function deepMerge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const out = { ...a }
  for (const k of Object.keys(b ?? {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
      out[k] = deepMerge((a[k] as Record<string, unknown>) ?? {}, b[k] as Record<string, unknown>)
    } else {
      out[k] = b[k]
    }
  }
  return out
}

declare global {
  interface Window {
    CPE: {
      state: CMSState
      set(patch: Partial<CMSState>): void
      setField(key: string, value: string): void
      setShow(key: string, visible: boolean): void
      on(fn: (s: CMSState) => void): () => void
      off(fn: (s: CMSState) => void): void
      export(): string
      reset(): void
    }
  }
}
