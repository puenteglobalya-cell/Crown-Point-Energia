'use client'

import dynamic from 'next/dynamic'
import { BLOCK_COORDS } from '@/lib/block-coords'
import type { YacimientoPin } from '@/lib/block-coords'
import type { MapBlockData } from '@/components/ArgentinaMapInteractive'
import type { CSSProperties } from 'react'

const YacimientosLeafletMap = dynamic(
  () => import('@/components/YacimientosLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 540, display: 'grid', placeItems: 'center',
        background: '#EBF0ED', borderRadius: 'var(--r-lg)',
      }}>
        <p style={{ color: '#667', fontSize: 13, margin: 0, fontFamily: 'system-ui' }}>Cargando mapa…</p>
      </div>
    ),
  }
)

export default function MapSection({ blocks = [], style }: { blocks?: MapBlockData[]; style?: CSSProperties }) {
  const pins: YacimientoPin[] = blocks
    .filter(b => BLOCK_COORDS[b.id])
    .map(b => ({
      id: b.id,
      title: b.title,
      subtitle: b.eyebrow,
      commodity: b.commodity as YacimientoPin['commodity'],
      lat: BLOCK_COORDS[b.id][0],
      lon: BLOCK_COORDS[b.id][1],
    }))

  return (
    <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', ...style }}>
      <YacimientosLeafletMap pins={pins} height={540} />
    </div>
  )
}
