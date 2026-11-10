const CACHE_NAME = 'taskrequest-v1'
const STATIC_ASSETS = ['/', '/manifest.json', '/favicon.svg', '/icons/icon-192.svg', '/icons/icon-512.svg']

function cleanString(str, maxLen = 140) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  // Seguridad: no interceptar ni cachear peticiones externas (evita filtrar cabeceras o peticiones de Supabase)
  if (!event.request.url.startsWith(self.location.origin)) return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const safeTitle = cleanString(data.title || 'TaskRequest', 80)
  const safeBody = cleanString(data.body || 'Nueva notificación', 160)

  event.waitUntil(
    self.registration.showNotification(safeTitle, {
      body: safeBody,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      vibrate: [100, 50, 100],
      tag: 'taskrequest-push',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Seguridad: enfocar ventana existente de la misma app o abrir la raíz local de forma segura
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./')
      }
    })
  )
})
