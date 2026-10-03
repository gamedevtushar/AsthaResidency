/**
 * The 10 colour themes. Each one sets the app colours for light and dark mode and the logo colours.
 * Plain data (no React) so scripts/make-icons.mjs can draw the matching app icons.
 */
const NEUTRAL = {
  slate: { light: { fg: '#0f172a', muted: '#475569', subtle: '#64748b' }, dark: { fg: '#e5e9f0', muted: '#9aa6b8', subtle: '#7d8aa0' } },
  stone: { light: { fg: '#1c1917', muted: '#57534e', subtle: '#78716c' }, dark: { fg: '#f5f5f4', muted: '#a8a29e', subtle: '#8a817c' } },
  zinc: { light: { fg: '#18181b', muted: '#52525b', subtle: '#71717a' }, dark: { fg: '#f4f4f5', muted: '#a1a1aa', subtle: '#82828c' } },
}

const p = (id, en, gu, neutral, logo, dot, light, dark) => ({
  id, name: { en, gu }, logo, dot,
  light: { ...NEUTRAL[neutral].light, ...light, surface: '#ffffff' },
  dark: { ...NEUTRAL[neutral].dark, ...dark },
})

export const PALETTES = [
  p('saffron', 'Saffron', 'કેસરી', 'stone', ['#f97316', '#c2410c'], '#fef3c7',
    { bg: '#f6f3ee', bar: '#fff3e6', accent: '#c2410c', ink: '#9a3412' },
    { bg: '#12100e', surface: '#1c1917', bar: '#211710', accent: '#ea580c', ink: '#fdba74' }),
  p('indigo', 'Indigo', 'નીલ', 'slate', ['#6366f1', '#4338ca'], '#fbbf24',
    { bg: '#eef2f7', bar: '#e3e7fd', accent: '#4f46e5', ink: '#4338ca' },
    { bg: '#0b1120', surface: '#141d2f', bar: '#1b2046', accent: '#6366f1', ink: '#a5b4fc' }),
  p('ocean', 'Ocean', 'સમુદ્ર', 'slate', ['#0ea5e9', '#0369a1'], '#fde68a',
    { bg: '#eef5f9', bar: '#e0f2fe', accent: '#0369a1', ink: '#075985' },
    { bg: '#07131c', surface: '#0f1f2b', bar: '#0c2536', accent: '#0284c7', ink: '#7dd3fc' }),
  p('peacock', 'Peacock', 'મોરપીંછ', 'slate', ['#14b8a6', '#0f766e'], '#fde68a',
    { bg: '#eff6f5', bar: '#ccfbf1', accent: '#0f766e', ink: '#115e59' },
    { bg: '#071412', surface: '#0f1f1d', bar: '#0c2a27', accent: '#0d9488', ink: '#5eead4' }),
  p('forest', 'Forest', 'હરિયાળી', 'zinc', ['#22c55e', '#15803d'], '#fef9c3',
    { bg: '#f0f5ef', bar: '#dcfce7', accent: '#15803d', ink: '#166534' },
    { bg: '#08130c', surface: '#102017', bar: '#0f2a19', accent: '#16a34a', ink: '#86efac' }),
  p('violet', 'Violet', 'જાંબલી', 'zinc', ['#a855f7', '#7e22ce'], '#fde68a',
    { bg: '#f5f2fa', bar: '#f3e8ff', accent: '#7e22ce', ink: '#6b21a8' },
    { bg: '#110b18', surface: '#1b1424', bar: '#24123a', accent: '#9333ea', ink: '#d8b4fe' }),
  p('rose', 'Rose', 'ગુલાબી', 'stone', ['#f43f5e', '#be123c'], '#fef3c7',
    { bg: '#faf2f3', bar: '#ffe4e6', accent: '#be123c', ink: '#9f1239' },
    { bg: '#160b0e', surface: '#221418', bar: '#2e1018', accent: '#e11d48', ink: '#fda4af' }),
  p('gold', 'Gold', 'સોનેરી', 'stone', ['#eab308', '#a16207'], '#fffbeb',
    { bg: '#f8f5ec', bar: '#fef9c3', accent: '#a16207', ink: '#854d0e' },
    { bg: '#13110a', surface: '#1e1b12', bar: '#2a230c', accent: '#ca8a04', ink: '#fde047' }),
  p('berry', 'Berry', 'રાણી', 'zinc', ['#d946ef', '#a21caf'], '#fef3c7',
    { bg: '#f9f1f9', bar: '#fae8ff', accent: '#a21caf', ink: '#86198f' },
    { bg: '#150a15', surface: '#21131f', bar: '#2d1030', accent: '#c026d3', ink: '#f0abfc' }),
  p('graphite', 'Graphite', 'ગ્રેફાઇટ', 'slate', ['#64748b', '#334155'], '#fde68a',
    { bg: '#f1f3f5', bar: '#e2e8f0', accent: '#334155', ink: '#1e293b' },
    { bg: '#0b0d10', surface: '#16191e', bar: '#1c2128', accent: '#64748b', ink: '#cbd5e1' }),
]

export const DEFAULT_PALETTE = 'saffron'
export const paletteById = (id) => PALETTES.find((x) => x.id === id) || PALETTES[0]

/** CSS variables for one palette in one mode */
export function paletteVars(pal, mode) {
  const v = pal[mode]
  return {
    '--c-bg': v.bg, '--c-fg': v.fg, '--c-muted': v.muted, '--c-subtle': v.subtle, '--c-surface': v.surface,
    '--c-accent': v.accent, '--c-accent-ink': v.ink, '--c-bar': v.bar,
    '--logo-1': pal.logo[0], '--logo-2': pal.logo[1], '--logo-dot': pal.dot,
  }
}

/** The logo as SVG text (favicon and icons) */
export const logoSvg = (pal, rx = 15) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal.logo[0]}"/><stop offset="1" stop-color="${pal.logo[1]}"/></linearGradient></defs><rect width="64" height="64" rx="${rx}" fill="url(#g)"/><path d="M13 51 L32 13 L51 51" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.75 40.5 H45.25" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="30.5" r="3.4" fill="${pal.dot}"/></svg>`
