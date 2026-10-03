import { useId } from 'react'

/**
 * Astha Residency mark: a capital "A" drawn as a building roof, with a warm lit window inside.
 * A = Astha, roof = residency, the light = home and faith (astha). Same artwork as public/favicon.svg; colours follow the chosen theme.
 */
export default function LogoMark({ className = 'size-10', title }) {
  const id = useId()
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-2)' }} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-bg)`} />
      {/* Roof / letter A */}
      <path d="M13 51 L32 13 L51 51" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Floor / crossbar */}
      <path d="M18.75 40.5 H45.25" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      {/* Lit window */}
      <circle cx="32" cy="30.5" r="3.4" style={{ fill: 'var(--logo-dot)' }} />
    </svg>
  )
}
