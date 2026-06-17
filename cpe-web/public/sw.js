// Crown Point Portal — Service Worker
// Handles push notifications and offline caching

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch (_) {}

  const title = data.title || 'Crown Point Energía'
  const options = {
    body:    data.body  || 'Nuevo reporte disponible en el portal.',
    icon:    '/logo.png',
    badge:   '/logo.png',
    tag:     data.tag   || 'cpe-notif',
    renotify: true,
    data:    { url: data.url || '/portal' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

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
