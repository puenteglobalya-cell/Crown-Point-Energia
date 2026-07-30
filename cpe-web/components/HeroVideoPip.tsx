'use client'

import { useEffect, useRef, useState } from 'react'

type Props = { src: string; poster?: string; lang?: 'es' | 'en' }

export function HeroVideoPip({ src, poster, lang = 'es' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 640px)').matches)
  }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.65
  }, [])

  if (isMobile === null) return null

  return (
    <div className="hero-video-pip">
      {isMobile ? (
        poster ? <img src={poster} alt="" className="hero-video-pip-poster" /> : null
      ) : (
        <video ref={videoRef} autoPlay muted loop playsInline preload="none" poster={poster}>
          <source src={src} type="video/mp4" />
        </video>
      )}
      <span className="hero-video-pip-label">
        <span className="hero-video-pip-dot" />
        <span className="lang-es" aria-hidden={lang !== 'es'}>Video aéreo</span>
        <span className="lang-en" aria-hidden={lang !== 'en'}>Aerial footage</span>
      </span>
    </div>
  )
}
