import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, Search, X, CalendarDays, Building2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { periodLabel, shiftPeriod, currentPeriod } from '../lib/format'
import { Chips, Select, cx } from './ui'
import { t } from '../i18n'

const wingOptions = (wings, includeCommon, allLabel) => [
  { value: '', label: allLabel || t('allWings') },
  ...(includeCommon ? [{ value: 'common', label: t('common') }] : []),
  ...wings.map((w) => ({ value: w.id, label: w.name })),
]

/** Dropdown wing filter. value: '' = all wings, 'common' = common only (when includeCommon) */
export function WingSelect({ value, onChange, includeCommon = false, allLabel, className = 'sm:w-48' }) {
  const { wings } = useData()
  return <Select size="sm" icon={Building2} value={value} onChange={onChange} options={wingOptions(wings, includeCommon, allLabel)} className={className} />
}

/** Horizontal wing chips (scrolls sideways on small screens) */
export function WingChips({ value, onChange, includeCommon = false, counts, className }) {
  const { wings } = useData()
  const opts = wingOptions(wings, includeCommon).map((o) => (counts ? { ...o, count: counts[o.value] } : o))
  if (wings.length < 2 && !includeCommon) return null
  return <Chips scroll value={value} onChange={onChange} options={opts} className={className} />
}

export function MonthPicker({ value, onChange, className }) {
  const isCurrent = value === currentPeriod()
  const btn = 'flex size-11 items-center justify-center text-muted transition hover:bg-fg/10 hover:text-fg cursor-pointer disabled:opacity-25 disabled:pointer-events-none'
  return (
    <div className={cx('inline-flex h-11 min-w-fit items-center overflow-hidden rounded-xl border border-fg/12 bg-surface', className)}>
      <motion.button type="button" aria-label="previous month" whileTap={{ scale: 0.85 }} className={btn} onClick={() => onChange(shiftPeriod(value, -1))}><ChevronLeft className="size-4" /></motion.button>
      <label className="relative flex min-w-36 flex-1 cursor-pointer items-center justify-center gap-2 px-1 text-sm font-semibold text-fg">
        <CalendarDays className="size-4 text-accent-ink" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {periodLabel(value)}
          </motion.span>
        </AnimatePresence>
        <input type="month" value={value} onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <motion.button type="button" aria-label="next month" whileTap={{ scale: 0.85 }} className={btn} disabled={isCurrent} onClick={() => onChange(shiftPeriod(value, 1))}><ChevronRight className="size-4" /></motion.button>
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder = '', className = '' }) {
  return (
    <div className={cx('group relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle transition group-focus-within:text-accent-ink" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-fg/12 bg-fg/[0.03] pl-10 pr-9 text-base text-fg placeholder:text-subtle outline-none transition hover:border-fg/25 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15 sm:text-sm" />
      <AnimatePresence>
        {value && (
          <motion.button type="button" aria-label={t('close')} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-subtle hover:bg-fg/10 hover:text-fg cursor-pointer">
            <X className="size-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Wing filter matcher: '' all, 'common' → wingId '', otherwise exact */
export const matchWing = (filter, wingId) => !filter || (filter === 'common' ? !wingId : wingId === filter)
