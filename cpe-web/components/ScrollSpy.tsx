'use client'

import { useEffect } from 'react'

/**
 * Highlights the active section link in a `.left-rail nav` as the user scrolls.
 * Reads the DOM (no props): matches nav anchors (href="#id") to sections by id
 * and toggles `.active`. Safe to mount on any page that has a left-rail nav.
 */
export default function ScrollSpy() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.left-rail nav a[href^="#"]')
    )
    if (links.length === 0) return

    const byId = new Map<string, HTMLAnchorElement>()
    const sections: HTMLElement[] = []
    for (const a of links) {
      const id = decodeURIComponent(a.getAttribute('href')!.slice(1))
      const el = document.getElementById(id)
      if (el) { byId.set(id, a); sections.push(el) }
    }
    if (sections.length === 0) return

    const setActive = (id: string) => {
      for (const a of links) a.classList.remove('active')
      byId.get(id)?.classList.add('active')
    }

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id)
          else visible.delete(e.target.id)
        }
        // pick the first section (in document order) currently in view
        const active = sections.find(s => visible.has(s.id))
        if (active) setActive(active.id)
      },
      { rootMargin: '-88px 0px -65% 0px', threshold: 0 }
    )
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return null
}
