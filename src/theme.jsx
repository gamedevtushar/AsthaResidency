import { useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { Sun, Moon, Monitor } from 'lucide-react'

/** Theme preference: 'light' | 'dark' | 'system'. Applied as data-theme on <html>. */
const KEY = 'theme'
const listeners = new Set()
const media = window.matchMedia('(prefers-color-scheme: dark)')

export const getThemePref = () => {
  try { return localStorage.getItem(KEY) || 'system' } catch { return 'system' }
}
const resolve = (pref) => (pref === 'system' ? (media.matches ? 'dark' : 'light') : pref)

export function applyTheme() {
  const theme = resolve(getThemePref())
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#211710' : '#fff3e6')
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref) } catch { /* storage unavailable */ }
  applyTheme()
  listeners.forEach((l) => l())
}

media.addEventListener('change', () => { applyTheme(); listeners.forEach((l) => l()) })

export const useThemePref = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, getThemePref)

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'Auto' },
]

/** Text size preference: 'normal' | 'large' | 'xl'. Applied as data-text on <html>, which scales every rem. */
const TEXT_KEY = 'textSize'
const textListeners = new Set()

export const getTextSize = () => {
  try { return localStorage.getItem(TEXT_KEY) || 'normal' } catch { return 'normal' }
}

export function setTextSize(size) {
  try { localStorage.setItem(TEXT_KEY, size) } catch { /* storage unavailable */ }
  document.documentElement.dataset.text = size
  textListeners.forEach((l) => l())
}

const useTextSize = () => useSyncExternalStore((cb) => { textListeners.add(cb); return () => textListeners.delete(cb) }, getTextSize)

const SIZES = [
  { value: 'normal', label: 'Normal', className: 'text-xs' },
  { value: 'large', label: 'Large', className: 'text-sm' },
  { value: 'xl', label: 'Extra large', className: 'text-lg' },
]

/** Compact A / A / A switch for the text size */
export function TextSizeSwitch({ className = '' }) {
  const size = useTextSize()
  return (
    <div role="radiogroup" aria-label="Text size" className={`inline-flex rounded-xl border border-fg/10 bg-fg/[0.04] p-0.5 ${className}`}>
      {SIZES.map(({ value, label, className: textClass }) => {
        const active = size === value
        return (
          <button key={value} type="button" role="radio" aria-checked={active} aria-label={label} onClick={() => setTextSize(value)}
            className={`relative flex size-8 items-center justify-center rounded-lg font-bold transition-colors cursor-pointer ${textClass} ${active ? 'text-fg' : 'text-subtle hover:text-fg'}`}>
            {active && <motion.span layoutId="text-pill" className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-fg/10" />}
            <span className="relative leading-none">A</span>
          </button>
        )
      })}
    </div>
  )
}

/** Compact Light / Dark / Auto switch */
export function ThemeSwitch({ className = '' }) {
  const pref = useThemePref()
  return (
    <div role="radiogroup" aria-label="Theme" className={`inline-flex rounded-xl border border-fg/10 bg-fg/[0.04] p-0.5 ${className}`}>
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = pref === value
        return (
          <button key={value} type="button" role="radio" aria-checked={active} aria-label={label} onClick={() => setThemePref(value)}
            className={`relative flex size-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${active ? 'text-fg' : 'text-subtle hover:text-fg'}`}>
            {active && <motion.span layoutId="theme-pill" className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-fg/10" />}
            <Icon className="relative size-4" />
          </button>
        )
      })}
    </div>
  )
}
