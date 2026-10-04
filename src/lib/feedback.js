import { useSyncExternalStore } from 'react'

/**
 * A tiny vibration on taps and when a scroller snaps (phones that support it). Can be turned off in the menu.
 */
const KEY = 'feedback'
const listeners = new Set()

export const feedbackOn = () => {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}
export function setFeedback(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* storage unavailable */ }
  listeners.forEach((l) => l())
  if (on) tick()
}
export const useFeedback = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, feedbackOn)

/** strength: 'light' for scrolling, 'tap' for buttons */
export function tick(strength = 'tap') {
  if (!feedbackOn()) return
  try { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(strength === 'light' ? 6 : 10) } catch { /* not supported */ }
}

/** Every button or link tap gets a buzz (scrollers call tick('light') themselves) */
export function installTapFeedback() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.('button, a, [role=radio], label')
    if (el && !el.disabled && !el.closest('[data-no-tick]')) tick()
  }, { capture: true, passive: true })
}
