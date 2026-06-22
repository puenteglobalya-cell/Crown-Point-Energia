'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export type YacimientoPin = {
  id: string
  title: string
  subtitle: string
  commodity: 'oil' | 'gas' | 'mixed'
  lat: number
  lon: number
}

const COMMODITY_COLOR: Record<YacimientoPin['commodity'], string> = {
  oil:   '#1F2566',
  gas:   '#4a8a3a',
  mixed: '#6CAE52',
}

// Fixed geographic coordinates for each known block slug
export const BLOCK_COORDS: Record<string, [number, number]> = {
  ppc:      [-35.20, -68.80],   // Puesto Pozo Cercado Oriental — Neuquina, Mendoza
  chanares: [-34.60, -67.80],   // Chañares Herrados — Cuyana, Mendoza
  cerro:    [-36.50, -69.00],   // Cerro de Los Leones — Neuquina, Mendoza
  tordillo: [-45.85, -67.54],   // El Tordillo / La Tapera — GSJ, Chubut
  piedra:   [-47.20, -68.60],   // Piedra Clavada / Koluel Kaike — GSJ, Santa Cruz
  tdf:      [-52.65, -68.60],   // Río Cullen / Las Violetas — Austral, TDF
}

function divIcon(L: typeof import('leaflet'), color: string) {
  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.9 14 22 14 22s14-12.1 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5.5" fill="white" opacity="0.9"/>
  </svg>`
  return L.divIcon({ className: '', html, iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -38] })
}

export default function YacimientosLeafletMap({ pins, height = 520 }: { pins: YacimientoPin[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    async function init() {
      const L = (await import('leaflet')).default

      // Prevent Leaflet from trying to load default marker PNGs (breaks in webpack)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      })
      mapRef.current = map

      // Remove "Leaflet" branding link — keep OSM credit
      map.attributionControl.setPrefix(false)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      const bounds: [number, number][] = []

      for (const pin of pins) {
        const icon = divIcon(L, COMMODITY_COLOR[pin.commodity])
        const marker = L.marker([pin.lat, pin.lon], { icon }).addTo(map)
        marker.bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:160px">
            <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-bottom:3px">${pin.subtitle}</div>
            <div style="font-size:14px;font-weight:600;color:#111;line-height:1.3">${pin.title}</div>
          </div>`,
          { maxWidth: 260 }
        )
        bounds.push([pin.lat, pin.lon])
      }

      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds as [number, number][]), { padding: [40, 40] })
      } else {
        // Default: show all Argentina
        map.setView([-40, -65], 4)
      }
    }

    init()

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [pins])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 'var(--r-lg)', overflow: 'hidden', zIndex: 0 }}
    />
  )
}
