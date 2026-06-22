'use client'

import dynamic from 'next/dynamic'
import type { MapBlockData } from '@/components/ArgentinaMapInteractive'
import { BLOCK_COORDS } from '@/components/YacimientosLeafletMap'
import type { YacimientoPin } from '@/components/YacimientosLeafletMap'
import type { CSSProperties } from 'react'

const YacimientosLeafletMap = dynamic(
  () => import('@/components/YacimientosLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 520, display: 'grid', placeItems: 'center', background: 'var(--bg-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)' }}>
        <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: 0 }}>Cargando mapa…</p>
      </div>
    ),
  }
)

export default function MapSection({ blocks, style }: { blocks: MapBlockData[]; style?: CSSProperties }) {
  const pins: YacimientoPin[] = blocks
    .filter(b => BLOCK_COORDS[b.id])
    .map(b => ({
      id: b.id,
      title: b.title,
      subtitle: b.eyebrow,
      commodity: b.commodity,
      lat: BLOCK_COORDS[b.id][0],
      lon: BLOCK_COORDS[b.id][1],
    }))

  return <YacimientosLeafletMap pins={pins} height={540} />
}
