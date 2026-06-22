// Crown Point Portal — Service Worker
const CACHE = 'cpe-portal-v2'
const PRECACHE = ['/portal', '/portal/dashboard', '/logo.png', '/manifest.json']

// ── Install: precache shell pages ─────────────────────────────────────────────
self.addEventListener('install', event => {
  // Don't skipWaiting immediately — let the activate event notify clients first
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  )
})

// ── Activate: delete old caches + notify clients of update ───────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        // Notify all open tabs that a new version is active
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs =>
          cs.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
        )
      )
  )
})

// ── Fetch: network-first for API/HTML, cache-first for assets ─────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Skip cross-origin, non-GET, and auth/API calls
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/auth/')) return

  // HTML navigation: network-first, fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok && PRECACHE.includes(url.pathname)) {
            caches.open(CACHE).then(c => c.put(event.request, res.clone()))
          }
          return res
        })
        .catch(() => caches.match(event.request).then(r => r ?? caches.match('/portal')))
    )
    return
  }

  // Static assets (fonts, images, JS chunks): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          if (res.ok) {
            const cloned = res.clone()
            caches.open(CACHE).then(c => c.put(event.request, cloned))
          }
          return res
        })
      })
    )
  }
})

// ── Push: show notification ────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch (_) {}

  // Silent ping from cleanup cron — don't show a notification
  if (data.type === 'ping') return

  const title = data.title || 'Crown Point Energía'
  const options = {
    body:     data.body  || 'Nuevo reporte disponible en el portal.',
    icon:     '/logo.png',
    badge:    '/logo.png',
    tag:      data.tag   || 'cpe-notif',
    renotify: true,
    data:     { url: data.url || '/portal' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click: open portal ───────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/portal'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const open = cs.find(c => c.url.includes('/portal'))
      if (open) { open.focus(); open.navigate(url) }
      else self.clients.openWindow(url)
    })
  )
})
