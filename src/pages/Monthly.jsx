import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { ImageDown, Plus, CalendarCog, Wallet, Layers, Building2, Rows3 } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { useEntries } from '../hooks/useEntries'
import { useBalances } from '../hooks/useBalances'
import { inr, inrShort, sum, shortDate, defaultPeriod, currentPeriod, shiftPeriod, periodLabel } from '../lib/format'
import { useWingPick } from '../hooks/useWingPick'
import SnapScroller from '../components/SnapScroller'
import { monthImage } from '../lib/a4image'
import { monthDues } from '../lib/ledger'
import { categoryIcon } from '../lib/icons'
import { t, tv } from '../i18n'
import { AnimatedNumber, Badge, Button, EmptyState, IconButton, IconTile, ScrollCard, SkeletonList, Spinner, cx, toast } from '../components/ui'
import { forms } from '../components/forms'

/**
 * The main screen, one wing (or the common account) and one month at a time.
 * Top bar: wing name and its balance. Sticky: the month's figures. Bottom: wing and month scrollers.
 * Accounts are usually settled a month later, so last month opens first.
 */
export default function Monthly() {
  const { isAdmin, canEdit } = useAuth()
  const { units, wings, loading: unitsLoading } = useData()
  const [period, setPeriod] = useState(defaultPeriod())
  const { wing, setWing, options: wingOptions, isCommon, label: wingLabel } = useWingPick()
  const monthOptions = useMemo(() => Array.from({ length: 36 }, (_, i) => shiftPeriod(currentPeriod(), i - 35)).map((p) => ({ value: p, label: periodLabel(p, true) })), [])
  const months = useMemo(() => [period], [period])
  const [view, setView] = useState('map') // building view first, list on request
  // Admins record a payment; everyone else just sees the details
  const pick = (r) => canEdit(r.wingId) && forms.open('payment', { due: r.due, unit: r.unit, period })

  const { rows: balances, loading: lb } = useBalances(unitsLoading ? [] : wings)
  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', '==', period)), [period])
  const { data: entries, loading: l2 } = useEntries(months)

  const rows = useMemo(() => (isCommon ? [] : monthDues(units.filter((u) => u.wingId === wing), dues.filter((d) => d.wingId === wing), period)), [units, dues, period, wing, isCommon])
  // This wing's own entries (the common account shows whole-building ones)
  const list = useMemo(() => entries.filter((x) => (isCommon ? !x.wingId : x.wingId === wing)).sort((a, b) => (b.date || '').localeCompare(a.date || '')), [entries, wing, isCommon])

  const wingBalance = balances.find((b) => b.id === (isCommon ? '' : wing))?.balance ?? 0
  const paid = rows.filter((r) => r.status === 'paid')
  const due = rows.filter((r) => r.status === 'due')
  const income = sum(list.filter((x) => x.type === 'income'))
  const expense = sum(list.filter((x) => x.type === 'expense'))

  // A4 picture of this month (white background, current language) to save or share
  const [saving, setSaving] = useState(false)
  const saveImage = async () => {
    setSaving(true)
    try {
      await monthImage({
        wingName: wingLabel, period, entries: list, totalBalance: wingBalance,
        figures: { collected: sum(paid), pending: sum(due), income, expense },
        floors: building(rows).map((f) => ({ key: f.key, items: f.items.map((r) => ({ label: seatLabel(r), amount: r.amount, status: r.status })) })),
      })
    } catch (e) { toast.error(e) } finally { setSaving(false) }
  }

  // Phone top bar: wing name beside the app name, its balance on the right
  const [slots, setSlots] = useState(null)
  useEffect(() => setSlots({ left: document.getElementById('topbar-left'), right: document.getElementById('topbar-right') }), [])

  if (unitsLoading) return <Spinner />
  if (!wings.length) return <EmptyState icon={Building2} title={t('mo.noUnits')} />

  return (
    <>
      {slots?.left && createPortal(<span className="shrink-0 text-sm font-semibold whitespace-nowrap text-muted">– {wingLabel}</span>, slots.left)}
      {slots?.right && createPortal(
        <div className="rounded-lg bg-accent/12 px-2.5 py-1 text-right leading-none">
          <p className="text-[0.625rem] font-semibold text-muted">{t('r.balance')}</p>
          <p className={cx('mt-0.5 text-base font-bold whitespace-nowrap tabular-nums', wingBalance < 0 ? 'text-bad' : 'text-accent-ink')}>{lb ? '—' : <AnimatedNumber value={wingBalance} />}</p>
        </div>, slots.right)}

      {/* Sticky summary: the month's figures (and the balance bar on wide screens) */}
      <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-3 shrink-0 space-y-2 bg-bg/95 px-4 pb-2 pt-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none">
        <div className="hidden items-center gap-3 rounded-xl bg-[linear-gradient(90deg,var(--logo-1),var(--logo-2))] px-3.5 py-2 text-white shadow-sm lg:flex">
          <Wallet className="size-5 shrink-0 opacity-90" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold opacity-85">{wingLabel} · {t('r.balance')}</p>
          </div>
          <p className="shrink-0 text-xl font-bold whitespace-nowrap">{lb ? '—' : <AnimatedNumber value={wingBalance} />}</p>
        </div>
        <div className={cx('grid divide-x divide-fg/10 rounded-lg border border-fg/10 bg-surface py-1', isCommon ? 'grid-cols-2' : 'grid-cols-4')}>
          {!isCommon && <Figure label={t('mo.collectedShort')} value={sum(paid)} tone="text-ok" />}
          {!isCommon && <Figure label={t('mo.pending')} value={sum(due)} tone={due.length ? 'text-bad' : 'text-fg'} />}
          <Figure label={t('income')} value={income} tone="text-ok" />
          <Figure label={t('expense')} value={expense} tone="text-bad" />
        </div>
      </div>

      <div className={cx('mb-3 grid gap-3 lg:min-h-0 lg:flex-1 lg:gap-4', !isCommon && 'lg:grid-cols-5')}>
        {/* Maintenance: every flat and shop, floor by floor */}
        {!isCommon && <ScrollCard className="!min-h-0 lg:col-span-3" bodyClass="p-2.5 sm:p-3"
          header={(
            <div className="flex shrink-0 items-center gap-2 px-2.5 pt-2.5 sm:px-3 sm:pt-3">
              <div className="flex shrink-0 rounded-lg border border-fg/10 bg-fg/[0.04] p-0.5">
                {[['map', Building2, t('mo.viewMap')], ['list', Rows3, t('mo.viewList')]].map(([v, Icon, label]) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                    className={cx('flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors cursor-pointer', view === v ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-fg')}>
                    <Icon className="size-3.5" />{label}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              {isAdmin && canEdit(wing) && <>
                <IconButton icon={CalendarCog} label={t('bills.button')} variant="secondary" size="sm" className="size-9" onClick={() => forms.open('bills', { period })} />
                <Button size="sm" variant="success" icon={Plus} onClick={() => forms.open('collect', { period })}>{t('collect.short')}</Button>
              </>}
            </div>
          )}>
          {l1 ? <SkeletonList /> : !rows.length ? (
            <EmptyState icon={Layers} title={t('mo.noUnits')} />
          ) : view === 'map' ? <SeatMap rows={rows} onPick={pick} /> : (
            <div className="space-y-2">
              {byFloor(rows).map((f, fi) => (
                <div key={f.key} className={cx('space-y-1 rounded-xl border-l-4 p-1.5', FLOOR_COLORS[fi % FLOOR_COLORS.length])}>
                  {f.items.map((r, i) => <UnitRow key={r.id} row={r} index={i} onClick={() => pick(r)} />)}
                </div>
              ))}
            </div>
          )}
        </ScrollCard>}

        {/* Other income and expenses: this wing's and the whole building's */}
        <ScrollCard className={cx(!isCommon && 'lg:col-span-2')}
          header={(
            <div className="flex shrink-0 items-center gap-2 px-4 pb-1 pt-3">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-muted">{t('mo.entries')}</h2>
              {isAdmin && <Button size="sm" icon={Plus} onClick={() => forms.open('entry', { type: 'expense', period, wingId: isCommon ? '' : wing })}>{t('add')}</Button>}
            </div>
          )}>
          {l2 ? <SkeletonList /> : !list.length ? (
            <EmptyState icon={Wallet} title={t('a.empty')} />
          ) : (
            <div className="divide-y divide-fg/[0.06]">
              {list.map((x, i) => {
                const isIn = x.type === 'income'
                const editable = canEdit(x.wingId)
                return (
                  <motion.div key={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 14) * 0.025 }}
                    onClick={editable ? () => forms.open('entry', { entry: x }) : undefined}
                    className={cx('flex items-start gap-3 px-4 py-2.5 transition-colors', editable && 'cursor-pointer hover:bg-fg/[0.06]')}>
                    <IconTile icon={categoryIcon(x.category)} tone={isIn ? 'green' : 'red'} className="size-9" iconClass="size-[1.125rem]" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold text-fg">
                        <span>{tv(x.category)}</span>
                        {!x.wingId && <Badge color="gray">{t('common')}</Badge>}
                      </p>
                      <p className="text-xs break-words text-muted">{[shortDate(x.date), tv(x.mode), x.description].filter(Boolean).join(' · ')}</p>
                    </div>
                    <p className={cx('shrink-0 pt-0.5 font-bold whitespace-nowrap', isIn ? 'text-ok' : 'text-fg')}>{isIn ? '+' : '−'}{inr(x.amount)}</p>
                  </motion.div>
                )
              })}
            </div>
          )}
        </ScrollCard>
      </div>

      {/* Wing and month scrollers, pinned just above the bottom menu */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 mt-auto flex shrink-0 items-center gap-1 border-t border-bar-line bg-bar px-2 py-1 sm:-mx-6 sm:px-4 lg:static lg:mx-0 lg:mb-0 lg:mt-4 lg:rounded-xl lg:border lg:px-2">
        <SnapScroller items={wingOptions} value={wing} onChange={setWing} className="w-[42%] shrink-0" />
        <span className="h-6 w-px shrink-0 bg-fg/15" />
        <SnapScroller items={monthOptions} value={period} onChange={setPeriod} className="min-w-0 flex-1" />
        {isAdmin && <IconButton icon={ImageDown} label={t('img.save')} variant="secondary" className="size-10" onClick={saveImage} disabled={saving || l1 || l2} />}
      </div>
    </>
  )
}

/**
 * Building view, like a seat map: top floor at the top, shops at the bottom, one row per floor.
 * Each box shows the flat number and the amount paid (₹0 while pending), so a whole wing fits on one screen.
 */
function SeatMap({ rows, onPick }) {
  const floors = building(rows)
  // Every row fills the full width; box and text size follow how many flats share a row
  const MAX = 6
  const widest = Math.min(MAX, Math.max(...floors.map((f) => f.items.length)))
  const size = widest <= 3 ? { box: 'py-2.5 gap-0.5', num: 'text-lg', amt: 'text-sm' }
    : widest === 4 ? { box: 'py-2 gap-0.5', num: 'text-base', amt: 'text-xs' }
      : { box: 'py-1.5', num: 'text-sm', amt: 'text-[0.6875rem]' }
  return (
    <div className="space-y-2">
      {floors.map((f, fi) => (
        <motion.div key={f.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.04 }}
          className={cx('grid gap-2', f.key === 'shop' && 'pt-2')}
          style={{ gridTemplateColumns: `repeat(${Math.min(MAX, f.items.length)}, minmax(0, 1fr))` }}>
          {f.items.map((r) => {
            const paid = r.status === 'paid'
            const due = r.status === 'due'
            return (
              <button key={r.id} type="button" onClick={() => onPick(r)} title={`${r.number} · ${r.ownerName}`}
                className={cx('flex min-w-0 flex-col items-center justify-center rounded-xl leading-tight tabular-nums shadow-sm transition-transform active:scale-95 cursor-pointer', size.box,
                  paid ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-emerald-900/30'
                    : due ? 'border border-bad/40 bg-bad/10 text-bad' : 'border border-fg/10 bg-fg/[0.04] text-subtle')}>
                <span className={cx('max-w-full px-1 text-center font-bold break-words', r.type === 'shop' ? size.amt : size.num)}>{seatLabel(r)}</span>
                <span className={cx('max-w-full px-1 font-semibold whitespace-nowrap', size.amt, paid ? 'text-white/85' : 'opacity-80')}>{inrShort(paid ? r.amount : 0)}</span>
              </button>
            )
          })}
        </motion.div>
      ))}
    </div>
  )
}

/** Each floor gets its own colour band in the list view */
const FLOOR_COLORS = [
  'border-sky-500/70 bg-sky-500/[0.07]', 'border-violet-500/70 bg-violet-500/[0.07]', 'border-amber-500/70 bg-amber-500/[0.07]',
  'border-teal-500/70 bg-teal-500/[0.07]', 'border-pink-500/70 bg-pink-500/[0.07]', 'border-lime-500/70 bg-lime-500/[0.07]',
]

/** Floors as in a real building: top floor first, then units without a floor, shops at the bottom */
function building(rows) {
  const floors = byFloor(rows)
  const numbered = floors.filter((f) => f.key !== 'shop' && f.key !== 'other')
  return [...numbered.reverse(), ...floors.filter((f) => f.key === 'other'), ...floors.filter((f) => f.key === 'shop')]
}

/** Group a wing's units by floor: "A-203" → floor 2; then anything without a floor; shops last */
function byFloor(items) {
  const groups = new Map()
  for (const r of items) {
    const n = Number(String(r.number).match(/(\d+)\s*$/)?.[1])
    const key = r.type === 'shop' ? 'shop' : n >= 100 ? String(Math.floor(n / 100)) : 'other'
    groups.set(key, [...(groups.get(key) || []), r])
  }
  const order = (k) => (k === 'shop' ? 2e9 : k === 'other' ? 1e9 : Number(k))
  return [...groups].sort((a, b) => order(a[0]) - order(b[0])).map(([key, list]) => ({ key, items: list }))
}

function Figure({ label, value, tone }) {
  return (
    <div className="min-w-0 px-1 text-center leading-tight">
      <p className="text-[0.6875rem] font-semibold text-muted">{label}</p>
      <p className={cx('text-[0.8125rem] font-bold whitespace-nowrap tabular-nums', tone)}>{inrShort(value)}</p>
    </div>
  )
}

/** One slim full-width row per flat: number, owner, amount, paid date or pending */
function UnitRow({ row: r, index, onClick }) {
  const paid = r.status === 'paid'
  return (
    <motion.button type="button" onClick={onClick}
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 20) * 0.012 }}
      className={cx('flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-1.5 text-left transition-colors cursor-pointer',
        paid ? 'bg-surface/80 hover:bg-surface' : 'bg-surface/50 hover:bg-surface/80')}>
      <span className="w-16 shrink-0 font-bold text-fg">{seatLabel(r)}</span>
      <span className="min-w-0 flex-1 text-sm whitespace-nowrap text-muted">{paid && r.paidOn ? shortDate(r.paidOn) : ''}</span>
      <span className={cx('shrink-0 font-bold whitespace-nowrap tabular-nums', paid ? 'text-ok' : r.status === 'due' ? 'text-bad' : 'text-subtle')}>{inr(paid ? r.amount : 0)}</span>
    </motion.button>
  )
}

/** Short name on screen: "A-101" → "101", "Shop 3" → "Shop 3" / "દુકાન 3" */
function seatLabel(r) {
  const n = String(r.number)
  if (r.type === 'shop') return `${t('shop')} ${n.match(/(\d+)\s*$/)?.[1] ?? n}`
  return n.replace(/^[^\d]*?-\s*/, '')
}
