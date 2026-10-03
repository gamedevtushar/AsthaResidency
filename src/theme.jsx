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
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#1b2046' : '#e3e7fd')
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
