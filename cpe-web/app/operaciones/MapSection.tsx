import type { CSSProperties } from 'react'

export default function MapSection({ style }: { blocks?: unknown[]; style?: CSSProperties }) {
  return (
    <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', background: '#EBF0ED', ...style }}>
      <img
        src="/argentina-map.svg"
        alt="Mapa de Argentina con bloques operativos de Crown Point Energía"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  )
}
