'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'

type Photo = { url: string; alt: string }

export default function PhotoCarousel({ photos, sizes }: { photos: Photo[]; sizes: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function goTo(i: number) {
    const track = trackRef.current
    if (!track) return
    const clamped = (i + photos.length) % photos.length
    track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' })
    setActive(clamped)
  }

  function onScroll() {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setActive(Math.round(track.scrollLeft / track.clientWidth))
  }

  if (photos.length === 1) {
    return (
      <div className="block-photo">
        <Image src={photos[0].url} alt={photos[0].alt} fill sizes={sizes} style={{ objectFit: 'cover' }} />
      </div>
    )
  }

  return (
    <div className="block-photo photo-carousel" role="region" aria-roledescription="carousel">
      <div className="photo-carousel-track" ref={trackRef} onScroll={onScroll}>
        {photos.map((p, i) => (
          <div className="photo-carousel-slide" key={p.url}>
            <Image src={p.url} alt={p.alt} fill sizes={sizes} style={{ objectFit: 'cover' }} />
          </div>
        ))}
      </div>

      <button type="button" className="photo-carousel-arrow prev" aria-label="Foto anterior" onClick={() => goTo(active - 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button type="button" className="photo-carousel-arrow next" aria-label="Foto siguiente" onClick={() => goTo(active + 1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      <div className="photo-carousel-dots">
        {photos.map((p, i) => (
          <button
            type="button"
            key={p.url}
            className={`photo-carousel-dot${i === active ? ' is-active' : ''}`}
            aria-label={`Ir a la foto ${i + 1} de ${photos.length}`}
            aria-current={i === active}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <span className="photo-carousel-count">{active + 1} / {photos.length}</span>
    </div>
  )
}
