import { useSyncExternalStore } from 'react'

/**
 * A soft click sound and a tiny vibration on taps and when a scroller snaps.
 * Can be turned off in the menu. The sound is made by the Web Audio API (no audio file needed).
 */
const KEY = 'feedback'
const listeners = new Set()
let ctx = null

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
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(strength === 'light' ? 1400 : 1000, now)
    osc.frequency.exponentialRampToValueAtTime(strength === 'light' ? 900 : 600, now + 0.04)
    gain.gain.setValueAtTime(strength === 'light' ? 0.035 : 0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  } catch { /* audio not available */ }
}

/** Every button or link tap gets the click (scrollers call tick('light') themselves) */
export function installTapFeedback() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.('button, a, [role=radio], label')
    if (el && !el.disabled && !el.closest('[data-no-tick]')) tick()
  }, { capture: true, passive: true })
}
