import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, animate, useMotionValue, useTransform, useDragControls } from 'motion/react'
import { X, Loader2, Inbox, CheckCircle2, AlertCircle, Info, AlertTriangle, WifiOff, ChevronDown, Check, Search, Minus, Plus, MoreVertical } from 'lucide-react'
import { t } from '../i18n'
import { inr, today, daysAgo } from '../lib/format'

export const cx = (...c) => c.filter(Boolean).join(' ')

/* ============ Motion presets ============ */
const spring = { type: 'spring', stiffness: 340, damping: 30 }
export const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
}
export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } },
}
export const reveal = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

/* ============ Button ============ */
const VARIANTS = {
  primary: 'bg-accent text-white shadow-sm hover:brightness-110',
  secondary: 'bg-surface text-fg border border-fg/12 shadow-sm hover:bg-fg/[0.04]',
  ghost: 'text-muted hover:text-fg hover:bg-fg/[0.06]',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
  dangerGhost: 'text-bad hover:bg-bad/10',
  dangerSoft: 'text-bad bg-bad/10 border border-bad/20 hover:bg-bad/15',
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, ...props }) {
  const sizes = {
    sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-11 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-5 text-base gap-2 rounded-xl',
    icon: 'size-11 rounded-xl',
    iconLg: 'size-12 rounded-xl',
  }
  const disabled = loading || props.disabled
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={spring}
      className={cx(
        'inline-flex items-center justify-center font-semibold transition-[background,box-shadow,filter,color,border] duration-150 disabled:opacity-45 disabled:pointer-events-none cursor-pointer whitespace-nowrap select-none',
        VARIANTS[variant], sizes[size], className,
      )}
      {...props}
      disabled={disabled}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className={size === 'lg' ? 'size-5' : 'size-4'} />}
      {children}
    </motion.button>
  )
}

/* ============ Tooltip (our own, replaces browser title bubbles) ============ */
export function Tooltip({ label, children, side = 'top' }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const show = () => {
    if (!label || !window.matchMedia('(hover: hover)').matches) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: r.left + r.width / 2, y: side === 'top' ? r.top - 8 : r.bottom + 8 })
  }
  const hide = () => setPos(null)
  return (
    <span ref={ref} className="inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onMouseDown={hide}>
      {children}
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.span role="tooltip" initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}
              style={{ left: pos.x, top: pos.y }}
              className={cx('pointer-events-none fixed z-[95] -translate-x-1/2 whitespace-nowrap rounded-lg bg-fg px-2.5 py-1.5 text-xs font-medium text-bg shadow-lg', side === 'top' && '-translate-y-full')}>
              {label}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  )
}

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'icon', className, ...props }) {
  return (
    <Tooltip label={label}>
      <Button variant={variant} size={size} aria-label={label} className={className} {...props}><Icon className="size-[1.125rem]" /></Button>
    </Tooltip>
  )
}

/* ============ Surfaces ============ */
export function Card({ className, children, hover, ...props }) {
  return (
    <motion.div variants={itemVariants} whileHover={hover ? { y: -2 } : undefined} transition={spring}
      className={cx('glass rounded-2xl', className)} {...props}>
      {children}
    </motion.div>
  )
}

const TILE = {
  indigo: 'bg-accent/12 text-accent-ink',
  green: 'bg-ok/12 text-ok',
  red: 'bg-bad/12 text-bad',
  amber: 'bg-warn/12 text-warn',
  cyan: 'bg-info/12 text-info',
  gray: 'bg-fg/[0.06] text-muted',
}
export function IconTile({ icon: Icon, tone = 'indigo', className = 'size-10', iconClass = 'size-5' }) {
  return (
    <div className={cx('flex shrink-0 items-center justify-center rounded-xl', TILE[tone], className)}>
      <Icon className={iconClass} />
    </div>
  )
}

/* ============ Form fields ============ */
// 16px text on phones stops iOS from zooming into the field
const fieldBase = 'w-full h-12 rounded-xl border bg-fg/[0.03] px-3.5 text-base text-fg placeholder:text-subtle outline-none transition duration-150 hover:border-fg/25 focus:bg-surface focus:ring-4 disabled:opacity-50 sm:text-base'
const fieldCls = (invalid) => cx(fieldBase, invalid
  ? 'border-bad/60 focus:border-bad focus:ring-bad/15'
  : 'border-fg/12 focus:border-accent focus:ring-accent/15')

/** Label + control + our own animated hint/error (no browser validation bubbles) */
export function Field({ label, hint, error, optional, children, className }) {
  return (
    <div className={cx('block', className)}>
      {label && (
        <p className="mb-2 flex items-center gap-1.5 text-[0.875rem] font-semibold text-muted">
          {label}{optional && <span className="font-normal text-subtle">· {t('optional')}</span>}
        </p>
      )}
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p key="err" role="alert" initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-bad/10 px-2.5 py-1.5 text-xs font-medium text-bad">
              <AlertCircle className="size-3.5 shrink-0" />{error}
            </span>
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-xs leading-relaxed text-subtle">{hint}</motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export const Input = ({ className, invalid, ...p }) => <input className={cx(fieldCls(invalid), className)} {...p} />

/** Rupee amount input */
export function AmountInput({ value, onChange, invalid, autoFocus, size = 'lg', placeholder = '0' }) {
  return (
    <div className={cx('flex items-center gap-2 rounded-xl border bg-fg/[0.03] px-4 transition focus-within:bg-surface focus-within:ring-4',
      size === 'lg' ? 'h-16' : 'h-12',
      invalid ? 'border-bad/60 focus-within:ring-bad/15' : 'border-fg/12 focus-within:border-accent focus-within:ring-accent/15')}>
      <span className={cx('font-semibold text-subtle', size === 'lg' ? 'text-2xl' : 'text-lg')}>₹</span>
      <input inputMode="decimal" autoFocus={autoFocus} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        className={cx('w-full min-w-0 bg-transparent font-bold text-fg outline-none placeholder:text-subtle/60', size === 'lg' ? 'text-3xl' : 'text-lg')} />
    </div>
  )
}

/** − value + */
export function Stepper({ value, onChange, min = 0, max = 99 }) {
  const btn = 'flex size-11 items-center justify-center rounded-lg text-muted transition hover:bg-fg/[0.06] hover:text-fg disabled:opacity-25 cursor-pointer'
  return (
    <div className="flex h-12 items-center justify-between rounded-xl border border-fg/12 bg-fg/[0.03] px-0.5">
      <motion.button type="button" aria-label="−" whileTap={{ scale: 0.85 }} className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus className="size-4" /></motion.button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-lg font-bold text-fg tabular-nums">{value}</motion.span>
      </AnimatePresence>
      <motion.button type="button" aria-label="+" whileTap={{ scale: 0.85 }} className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus className="size-4" /></motion.button>
    </div>
  )
}

const chipOn = 'border-accent bg-accent/10 text-accent-ink'
const chipOff = 'border-fg/12 bg-fg/[0.03] text-muted hover:border-fg/25 hover:text-fg'

/** Selectable chips. variant "tile" shows icon above label in a grid. */
export function Chips({ value, onChange, options, className, variant = 'pill', scroll }) {
  const tile = variant === 'tile'
  return (
    <div className={cx(tile ? 'grid gap-2' : scroll ? 'no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5' : 'flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <motion.button key={String(o.value)} type="button" whileTap={{ scale: 0.96 }} onClick={() => onChange(o.value)} aria-pressed={active}
            className={cx(
              'relative inline-flex shrink-0 items-center rounded-xl border font-medium transition-colors cursor-pointer',
              tile ? 'min-h-16 flex-col justify-center gap-1.5 px-2 py-2.5 text-center text-xs' : 'h-10 gap-2 px-3.5 text-sm whitespace-nowrap',
              active ? chipOn : chipOff,
            )}>
            {o.icon && <o.icon className={tile ? 'size-5' : 'size-4'} />}
            <span className={tile ? 'leading-tight' : ''}>{o.label}</span>
            {o.count !== undefined && <span className={cx('rounded-md px-1.5 text-[0.8125rem] font-semibold', active ? 'bg-accent/15' : 'bg-fg/[0.07]')}>{o.count}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

/** Today / Yesterday chips + full date picker */
export function DateField({ value, onChange }) {
  const quick = [{ value: today(), label: t('today') }, { value: daysAgo(1), label: t('yesterday') }]
  return (
    <div className="flex gap-2">
      {quick.map((q) => (
        <motion.button key={q.label} type="button" whileTap={{ scale: 0.96 }} onClick={() => onChange(q.value)} aria-pressed={value === q.value}
          className={cx('h-11 shrink-0 rounded-xl border px-3.5 text-sm font-medium transition-colors cursor-pointer', value === q.value ? chipOn : chipOff)}>
          {q.label}
        </motion.button>
      ))}
      <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className={cx(fieldCls(false), 'h-11 min-w-0 flex-1')} />
    </div>
  )
}

/* ============ Anchored popover (for Select and Menu) ============ */
function useAnchor(open, ref, { minWidth = 0, maxHeight = 300, align = 'start' }) {
  const [pos, setPos] = useState(null)
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const update = () => {
      const r = ref.current.getBoundingClientRect()
      const width = Math.min(Math.max(r.width, minWidth), window.innerWidth - 16)
      const below = window.innerHeight - r.bottom - 12
      const above = r.top - 12
      const up = below < Math.min(maxHeight, 240) && above > below
      let left = align === 'end' ? r.right - width : r.left
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
      setPos({ left, width, up, top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined, maxHeight: Math.min(maxHeight, up ? above : below) })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [open, ref, minWidth, maxHeight, align])
  return open ? pos : null
}

function Popover({ open, onClose, anchorRef, children, minWidth, maxHeight, align, onKeyDown }) {
  const pos = useAnchor(open, anchorRef, { minWidth, maxHeight, align })
  useEffect(() => {
    if (!open) return
    // Capture phase so Escape closes only the popover, not the surrounding modal
    const key = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() } else onKeyDown?.(e)
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [open, onClose, onKeyDown])
  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <>
          <div key="bg" className="fixed inset-0 z-[80]" onClick={(e) => { e.stopPropagation(); onClose() }} />
          <motion.div key="pop"
            initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong fixed z-[81] flex flex-col overflow-hidden rounded-2xl p-1.5">
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/**
 * Our own dropdown (replaces the browser <select>).
 * options: strings or { value, label, icon?, hint? }. onChange receives the value.
 */
export function Select({ value, onChange, options, placeholder, className, searchable, icon: Icon, invalid, size = 'md' }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }))
  const sel = opts.find((o) => o.value === value)
  const shown = q ? opts.filter((o) => `${o.label} ${o.hint || ''}`.toLowerCase().includes(q.toLowerCase())) : opts
  const close = () => { setOpen(false); setQ('') }
  const pick = (v) => { onChange(v); close() }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, shown.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && shown[hi]) { e.preventDefault(); pick(shown[hi].value) }
  }
  const SelIcon = sel?.icon || Icon

  return (
    <>
      <button type="button" ref={ref} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { setHi(Math.max(0, opts.indexOf(sel))); setOpen((o) => !o) }}
        className={cx(fieldCls(invalid), 'flex items-center gap-2.5 text-left cursor-pointer', size === 'sm' && 'h-11 text-sm sm:text-sm', className)}>
        {SelIcon && <SelIcon className="size-4 shrink-0 text-accent-ink" />}
        <span className={cx('min-w-0 flex-1 truncate', !sel && 'text-subtle')}>{sel ? sel.label : placeholder ?? t('select')}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="shrink-0"><ChevronDown className="size-4 text-subtle" /></motion.span>
      </button>
      <Popover open={open} onClose={close} anchorRef={ref} minWidth={220} maxHeight={320} onKeyDown={onKeyDown}>
        {searchable && (
          <div className="relative mb-1.5 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setHi(0) }} placeholder={t('searchPh')}
              className="h-11 w-full rounded-xl border border-fg/12 bg-fg/[0.03] pl-9 pr-3 text-base text-fg placeholder:text-subtle outline-none focus:border-accent sm:text-sm" />
          </div>
        )}
        <div role="listbox" className="no-scrollbar min-h-0 overflow-y-auto">
          {shown.length === 0 && <p className="px-3 py-3 text-center text-sm text-subtle">{t('noMatches')}</p>}
          {shown.map((o, i) => (
            <button key={String(o.value)} type="button" role="option" aria-selected={o.value === value}
              onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}
              className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm transition-colors cursor-pointer', i === hi ? 'bg-fg/[0.06] text-fg' : 'text-muted')}>
              {o.icon && <o.icon className="size-4 shrink-0 text-subtle" />}
              <span className="min-w-0 flex-1 truncate">{o.label}{o.hint && <span className="ml-2 text-xs text-subtle">{o.hint}</span>}</span>
              {o.value === value && <Check className="size-4 shrink-0 text-accent-ink" />}
            </button>
          ))}
        </div>
      </Popover>
    </>
  )
}

/** "⋯" action menu. items: [{ label, icon, onClick, danger }] */
export function Menu({ items, label = t('more'), className }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <span ref={ref} className={cx('inline-flex', className)} onClick={(e) => e.stopPropagation()}>
        <IconButton icon={MoreVertical} label={label} className="size-9 rounded-lg" onClick={() => setOpen((o) => !o)} />
      </span>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} minWidth={230} align="end">
        {items.filter(Boolean).map((it) => (
          <button key={it.label} type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick() }}
            className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors cursor-pointer',
              it.danger ? 'text-bad hover:bg-bad/10' : 'text-fg hover:bg-fg/[0.06]')}>
            {it.icon && <it.icon className="size-4" />}{it.label}
          </button>
        ))}
      </Popover>
    </>
  )
}

/** Pill tabs with a sliding active indicator */
export function Segmented({ value, onChange, options, className }) {
  const id = useId()
  return (
    <div className={cx('inline-flex h-11 shrink-0 rounded-xl border border-fg/10 bg-fg/[0.05] p-1', className)}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={active}
            className={cx('relative flex flex-1 items-center justify-center rounded-lg px-3.5 text-[0.875rem] font-semibold whitespace-nowrap cursor-pointer transition-colors', active ? 'text-fg' : 'text-muted hover:text-fg')}>
            {active && <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-fg/10" />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ============ Badge ============ */
const BADGE = {
  green: 'bg-ok/12 text-ok',
  red: 'bg-bad/12 text-bad',
  amber: 'bg-warn/12 text-warn',
  blue: 'bg-accent/12 text-accent-ink',
  gray: 'bg-fg/[0.07] text-muted',
}
export const Badge = ({ color = 'gray', children, className, dot }) => (
  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap', BADGE[color], className)}>
    {dot && <span className="size-1.5 rounded-full bg-current" />}{children}
  </span>
)

/* ============ Page header ============ */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <motion.div variants={itemVariants} className="mb-4 flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between lg:mb-5">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight text-fg lg:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-md:[&>*:first-child]:flex-1">{actions}</div>}
    </motion.div>
  )
}

/* ============ Numbers & progress ============ */
export function AnimatedNumber({ value, format = inr }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => format(Math.round(v)))
  useEffect(() => {
    const c = animate(mv, Number(value) || 0, { duration: 0.9, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [value, mv])
  return <motion.span>{text}</motion.span>
}

const BAR = { green: 'bg-ok', indigo: 'bg-accent', red: 'bg-bad', amber: 'bg-warn' }
export function Progress({ value, tone = 'green', className = 'h-2' }) {
  return (
    <div className={cx('overflow-hidden rounded-full bg-fg/[0.08]', className)}>
      <motion.div className={cx('h-full rounded-full', BAR[tone])}
        initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} />
    </div>
  )
}

/** Animated donut ring (colour via tone class) */
export function Ring({ value, size = 120, stroke = 12, tone = 'text-ok', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="relative shrink-0" style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-fg/[0.08]" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" className={tone}
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/* ============ Lists ============ */
/** Card whose body scrolls inside (desktop fixed-frame pages) */
export function ScrollCard({ className, bodyClass, children, header }) {
  return (
    <Card className={cx('flex min-h-[320px] flex-col overflow-hidden lg:min-h-0 lg:flex-1', className)}>
      {header}
      <div className={cx('no-scrollbar min-h-0 flex-1 overflow-y-auto', bodyClass)}>{children}</div>
    </Card>
  )
}

/* ============ Empty / loading ============ */
export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 rounded-2xl bg-accent/10 p-4 text-accent-ink">
        <Icon className="size-7" />
      </div>
      <p className="font-semibold text-fg">{title}</p>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="divide-y divide-fg/[0.07]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="shimmer size-10 rounded-xl" />
          <div className="flex-1 space-y-2"><div className="shimmer h-3 w-1/3 rounded" /><div className="shimmer h-2.5 w-1/2 rounded" /></div>
          <div className="shimmer h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTiles({ count = 12 }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
      {Array.from({ length: count }, (_, i) => <div key={i} className="shimmer h-[88px] rounded-xl" />)}
    </div>
  )
}

export const Spinner = ({ className }) => (
  <div className={cx('flex items-center justify-center py-16', className)}>
    <div className="size-9 animate-spin-slow rounded-full border-[3px] border-fg/10 border-t-accent" />
  </div>
)

/* ============ Modal (bottom sheet on mobile, dialog on desktop) ============ */
function useScrollLock() {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
}

/** Mount conditionally inside <AnimatePresence> to get exit animations. */
export function Modal({ onClose, title, subtitle, icon, iconTone = 'indigo', children, footer, size = 'md' }) {
  const desktop = useMedia('(min-width: 640px)')
  const drag = useDragControls()
  useScrollLock()
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        role="dialog" aria-modal="true"
        className={cx('glass-strong relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl', size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
        initial={desktop ? { opacity: 0, scale: 0.96, y: 10 } : { y: '100%' }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={desktop ? { opacity: 0, scale: 0.97, y: 6 } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 38 }}
        drag={desktop ? false : 'y'} dragListener={false} dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => (info.offset.y > 110 || info.velocity.y > 600) && onClose()}
      >
        {!desktop && (
          <div className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
            <div className="h-1.5 w-10 rounded-full bg-fg/20" />
          </div>
        )}
        <div className="flex shrink-0 items-center gap-3 px-5 pb-4 pt-2 sm:px-6 sm:pt-6">
          {icon && <IconTile icon={icon} tone={iconTone} className="size-11" />}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-fg/[0.05] text-muted transition hover:bg-fg/10 hover:text-fg cursor-pointer">
            <X className="size-5" />
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center gap-2.5 border-t border-fg/10 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
            {footer}
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  )
}

/* ============ Toasts ============ */
let pushToast = () => {}
let toastId = 0
const show = (type) => (msg, opts = {}) =>
  pushToast({ id: ++toastId, type, msg: typeof msg === 'string' ? msg : friendlyError(msg), ...opts })

export const toast = { success: show('success'), error: show('error'), info: show('info'), warning: show('warning') }

export function friendlyError(e) {
  const code = e?.code || ''
  if (code === 'permission-denied') return t('errPermission')
  if (code === 'unavailable' || code === 'auth/network-request-failed') return t('errNetwork')
  if (code === 'not-found') return t('errNotFound')
  return e?.message || t('errGeneric')
}

const TOAST = {
  success: { icon: CheckCircle2, tone: 'text-ok', bar: 'bg-ok' },
  error: { icon: AlertCircle, tone: 'text-bad', bar: 'bg-bad' },
  info: { icon: Info, tone: 'text-info', bar: 'bg-info' },
  warning: { icon: AlertTriangle, tone: 'text-warn', bar: 'bg-warn' },
}

export function Toaster() {
  const [items, setItems] = useState([])
  const dismiss = (id) => setItems((x) => x.filter((i) => i.id !== id))
  useEffect(() => {
    pushToast = (item) => {
      const duration = item.duration ?? (item.action ? 6000 : item.type === 'error' ? 5000 : 3500)
      setItems((x) => [...x.slice(-3), { ...item, duration }])
      setTimeout(() => dismiss(item.id), duration)
    }
  }, [])

  return createPortal(
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-96 sm:items-stretch">
      <AnimatePresence initial={false}>
        {items.map((it) => {
          const s = TOAST[it.type]
          return (
            <motion.div key={it.id} layout
              initial={{ opacity: 0, y: -20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 90 && dismiss(it.id)}
              className="glass-strong pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl sm:max-w-none">
              <div className="flex items-center gap-3 py-3 pl-4 pr-2">
                <s.icon className={cx('size-5 shrink-0', s.tone)} />
                <div className="min-w-0 flex-1">
                  {it.title && <p className="text-sm font-semibold text-fg">{it.title}</p>}
                  <p className={cx('text-sm', it.title ? 'text-muted' : 'text-fg')}>{it.msg}</p>
                </div>
                {it.action && (
                  <button type="button" onClick={() => { it.action.onClick(); dismiss(it.id) }}
                    className="shrink-0 rounded-lg bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-ink transition hover:bg-accent/20 cursor-pointer">
                    {it.action.label}
                  </button>
                )}
                <button type="button" onClick={() => dismiss(it.id)} aria-label={t('close')} className="shrink-0 rounded-lg p-2 text-subtle hover:bg-fg/[0.06] hover:text-fg cursor-pointer"><X className="size-4" /></button>
              </div>
              <motion.div className={cx('absolute bottom-0 left-0 h-0.5 w-full origin-left opacity-70', s.bar)}
                initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: it.duration / 1000, ease: 'linear' }} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

/* ============ Confirm dialog (promise based) ============ */
let openConfirm = () => Promise.resolve(false)

/** await confirmDialog({ title, message, confirmText, tone: 'danger' | 'primary' }) → true/false */
export const confirmDialog = (opts) => openConfirm(opts)

export function ConfirmHost() {
  const [state, setState] = useState(null)
  useEffect(() => {
    openConfirm = (opts) => new Promise((resolve) => setState({ ...opts, resolve }))
  }, [])
  const close = (result) => { state?.resolve(result); setState(null) }
  return (
    <AnimatePresence>
      {state && <ConfirmDialog key="confirm" {...state} onClose={close} />}
    </AnimatePresence>
  )
}

function ConfirmDialog({ title, message, confirmText, tone = 'danger', onClose }) {
  useScrollLock()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  const danger = tone === 'danger'
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-5">
      <motion.div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={() => onClose(false)}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div role="alertdialog" className="glass-strong relative w-full max-w-sm rounded-3xl p-6 text-center"
        initial={{ opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
        <div className="mx-auto mb-4 w-fit">
          <IconTile icon={danger ? AlertTriangle : Info} tone={danger ? 'red' : 'indigo'} className="size-14 rounded-2xl" iconClass="size-7" />
        </div>
        <h3 className="text-lg font-bold text-fg">{title || t('confirm.title')}</h3>
        {message && <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" size="lg" onClick={() => onClose(false)}>{t('cancel')}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="lg" onClick={() => onClose(true)} autoFocus>{confirmText || t('confirm.yes')}</Button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

/* ============ Offline banner ============ */
export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => { setOnline(true); toast.success(t('backOnline')) }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return createPortal(
    <AnimatePresence>
      {!online && (
        <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
          className="fixed inset-x-0 top-3 z-[99] flex justify-center px-3">
          <div className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-warn">
            <WifiOff className="size-4" />{t('offline')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
