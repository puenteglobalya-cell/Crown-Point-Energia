'use client'

import { useEffect, useState } from 'react'

// The address never appears in the server-rendered HTML — user/domain are
// only joined and written to the DOM after mount, so scrapers that read raw
// page source (not a JS-executing crawler) don't get a harvestable address.
export default function ObfuscatedEmail({
  user,
  domain,
  style,
  className,
}: {
  user: string
  domain: string
  style?: React.CSSProperties
  className?: string
}) {
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    setAddress(`${user}@${domain}`)
  }, [user, domain])

  if (!address) {
    return (
      <span className={className} style={style} aria-hidden="true">
        {user} [at] {domain}
      </span>
    )
  }

  return (
    <a href={`mailto:${address}`} className={className} style={style}>
      {address}
    </a>
  )
}
