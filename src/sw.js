// Template: the build (vite.config.js) emits this as dist/sw.js with __BUILD_ID__ filled in. Not part of the app bundle.
// Service worker: makes the app installable, fast and always up to date.
// __BUILD_ID__ is replaced on every build, so each deploy gets a fresh cache and old ones are deleted.
const VERSION = '__BUILD_ID__'
const CACHE = `astha-${VERSION}`
const BASE = new URL(self.registration.scope).pathname // e.g. /AsthaResidency/
const ICON_V = 'v=2' // bump when the logo changes (also in index.html and manifest.webmanifest)
const SHELL = [BASE, `${BASE}manifest.webmanifest?${ICON_V}`, `${BASE}favicon.svg?${ICON_V}`, `${BASE}icon-192.png?${ICON_V}`]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
    await self.clients.claim()
  })())
})

// The page asks us to take over after the user taps "Update"
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

const save = (req, res) => {
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // Only this app's own files. Firebase / Google requests always go straight to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  if (req.mode === 'navigate') {
    // Pages: network first (so a new deploy shows immediately); offline → cached app
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => { if (res.ok) save(BASE, res.clone()); return res })
        .catch(() => caches.match(BASE)),
    )
    return
  }

  if (url.pathname.startsWith(`${BASE}assets/`)) {
    // Built JS/CSS have a content hash in their name and never change: cache first
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))))
    return
  }

  // Icons, manifest, other public files: use the cached copy and refresh it in the background
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req, { cache: 'no-cache' }).then((res) => save(req, res)).catch(() => hit)
      return hit || fresh
    }),
  )
})
