'use client'

import { useEffect } from 'react'

export default function RevealObserver() {
  useEffect(() => {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('in')
              io.unobserve(e.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      )
      document.querySelectorAll('.reveal').forEach(el => io.observe(el))
      return () => io.disconnect()
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'))
    }
  }, [])
  return null
}
