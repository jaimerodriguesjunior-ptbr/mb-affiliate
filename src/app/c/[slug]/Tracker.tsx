'use client'

import { useEffect, useRef } from 'react'

export function Tracker({ 
  tenantId, 
  eventType, 
  productId 
}: { 
  tenantId: string
  eventType: string
  productId?: string
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, event_type: eventType, product_id: productId })
    }).catch(e => console.error(e))
  }, [tenantId, eventType, productId])

  return null
}

export function TrackedSocialLink({
  href,
  target,
  className,
  title,
  tenantId,
  eventType,
  children
}: {
  href: string
  target?: string
  className?: string
  title?: string
  tenantId: string
  eventType: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target={target}
      className={className}
      title={title}
      rel="noopener noreferrer"
      onClick={() => {
        // Send beacon immediately on click
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: tenantId, event_type: eventType }),
          keepalive: true
        }).catch(() => {})
      }}
    >
      {children}
    </a>
  )
}

