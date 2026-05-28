'use client'

import dynamic from 'next/dynamic'
import type { MapBlockData } from '@/components/ArgentinaMapInteractive'
import type { CSSProperties } from 'react'

const ArgentinaMapInteractive = dynamic(
  () => import('@/components/ArgentinaMapInteractive'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 480, display: 'grid', placeItems: 'center', background: 'var(--bg-alt)', borderRadius: 'var(--r-lg)', border: '1px solid var(--rule)' }}>
        <p style={{ color: 'var(--fg-muted)', fontSize: 14, margin: 0 }}>
          <span className="lang-es">Cargando mapa…</span>
          <span className="lang-en">Loading map…</span>
        </p>
      </div>
    ),
  }
)

export default function MapSection({ blocks, style }: { blocks: MapBlockData[]; style?: CSSProperties }) {
  return <ArgentinaMapInteractive blocks={blocks} style={style} />
}
