import { useSyncExternalStore } from 'react'
import { toast } from './components/ui'
import { t } from './i18n'

/*
 * Installable app ("Add to Home Screen") + service-worker updates.
 * Imported first in main.jsx so the browser's install event is never missed.
 */

let deferredPrompt = null
let justInstalled = false
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // we show our own "Install app" option in the menu instead
  deferredPrompt = e
  emit()
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  justInstalled = true
  emit()
})

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const snapshot = () => `${!!deferredPrompt}|${justInstalled || isStandalone()}`

/** { canPrompt: browser can show its install dialog, installed: already running as an app } */
export function useInstall() {
  const s = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, snapshot)
  const [canPrompt, installed] = s.split('|').map((v) => v === 'true')
  return { canPrompt, installed }
}

/** Shows the browser's install dialog. Returns true if the user accepted. */
export async function promptInstall() {
  if (!deferredPrompt) return false
  const e = deferredPrompt
  deferredPrompt = null
  emit()
  e.prompt()
  const { outcome } = await e.userChoice
  return outcome === 'accepted'
}

/** Registers the service worker (production only) and offers an "Update" button when a new version is deployed. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      const offerUpdate = (worker) => toast.info(t('pwa.updateReady'), {
        duration: 120000,
        action: { label: t('pwa.update'), onClick: () => worker.postMessage('SKIP_WAITING') },
      })
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting)
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker)
        })
      })
      // Look for a new version when the app comes back to the foreground, and every 30 minutes
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update())
      setInterval(() => reg.update(), 30 * 60 * 1000)
    } catch (err) {
      console.warn('Service worker not registered', err)
    }
  })
  // After "Update", the new version takes over → reload once to use it.
  // (Not on the very first visit, when the worker takes control for the first time.)
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; window.location.reload() }
  })
}
