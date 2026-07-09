const CACHE = 'lesson-tracker-v1'
const PRECACHE = ['/manifest.webmanifest']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const { pathname } = new URL(e.request.url)

  // Versioned static chunks are immutable — cache-first
  if (pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then(
        hit => hit || fetch(e.request).then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()))
          return res
        })
      )
    )
    return
  }

  // Skip other /_next/ internals (HMR, data routes)
  if (pathname.startsWith('/_next/')) return

  // HTML pages and static assets — network-first, cache as fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
