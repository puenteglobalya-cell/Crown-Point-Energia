'use client'

import { useEffect, useRef } from 'react'

type Props = { src: string }

export function HeroVideoPip({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.35
  }, [])

  return (
    <div className="hero-video-pip">
      <video ref={videoRef} autoPlay muted loop playsInline preload="none">
        <source src={src} type="video/mp4" />
      </video>
      <span className="hero-video-pip-label">
        <span className="hero-video-pip-dot" />
        <span className="lang-es">Video aéreo</span>
        <span className="lang-en">Aerial footage</span>
      </span>
    </div>
  )
}
