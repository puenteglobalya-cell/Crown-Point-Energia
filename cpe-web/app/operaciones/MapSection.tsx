'use client'

import ArgentinaMapInteractive from '@/components/ArgentinaMapInteractive'
import type { MapBlockData } from '@/components/ArgentinaMapInteractive'
import type { CSSProperties } from 'react'

export default function MapSection({ blocks, style }: { blocks: MapBlockData[]; style?: CSSProperties }) {
  return <ArgentinaMapInteractive blocks={blocks} style={style} />
}
