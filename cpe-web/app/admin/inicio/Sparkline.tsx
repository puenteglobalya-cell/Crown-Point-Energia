// Server-safe inline SVG sparkline — no client JS, no chart library.
export function Sparkline({
  data,
  width = 240,
  height = 44,
  stroke = 'var(--accent)',
  fill = 'color-mix(in oklab, var(--accent) 12%, transparent)',
}: {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
}) {
  const n = data.length
  if (n === 0) return null
  const max = Math.max(...data, 1)
  const pad = 3
  const w = width - pad * 2
  const h = height - pad * 2
  const step = n > 1 ? w / (n - 1) : 0
  const pts = data.map((v, i) => {
    const x = pad + i * step
    const y = pad + h - (v / max) * h
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${(pad + w).toFixed(1)},${(pad + h).toFixed(1)} L${pad.toFixed(1)},${(pad + h).toFixed(1)} Z`
  const last = pts[pts.length - 1]

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-hidden="true" style={{ display: 'block' }}>
      <path d={area} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r={2.5} fill={stroke} />}
    </svg>
  )
}
