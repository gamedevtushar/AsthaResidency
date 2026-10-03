import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { Download, Plus, CheckCircle2, CalendarCog, Store, Wallet, Layers, Building2 } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { useEntries } from '../hooks/useEntries'
import { useBalances } from '../hooks/useBalances'
import { inr, sum, shortDate, downloadCsv, defaultPeriod } from '../lib/format'
import { monthDues } from '../lib/ledger'
import { categoryIcon } from '../lib/icons'
import { t, tv } from '../i18n'
import { AnimatedNumber, Badge, Button, EmptyState, IconButton, IconTile, ScrollCard, SkeletonList, Spinner, cx, toast } from '../components/ui'
import { MonthPicker } from '../components/filters'
import { forms } from '../components/forms'

/**
 * The main screen, one wing and one month at a time.
 * Sticky on top: wing tabs, the balance and the month's four figures. The month switcher sits at the bottom.
 * Accounts are usually settled a month later, so last month opens first.
 */
export default function Monthly() {
  const { profile, isAdmin, canEdit } = useAuth()
  const { units, wings, loading: unitsLoading } = useData()
  const [period, setPeriod] = useState(defaultPeriod())
  const [picked, setWing] = useState(profile?.role === 'wing_admin' ? profile.wingId : '')
  const wing = wings.some((w) => w.id === picked) ? picked : wings[0]?.id || ''
  const months = useMemo(() => [period], [period])

  const { rows: balances, loading: lb } = useBalances(unitsLoading ? [] : wings)
  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', '==', period)), [period])
  const { data: entries, loading: l2 } = useEntries(months)

  const rows = useMemo(() => monthDues(units.filter((u) => u.wingId === wing), dues.filter((d) => d.wingId === wing), period), [units, dues, period, wing])
  // The wing's own entries plus whole-building (common) ones
  const list = useMemo(() => entries.filter((x) => !x.wingId || x.wingId === wing).sort((a, b) => (b.date || '').localeCompare(a.date || '')), [entries, wing])

  const total = sum(balances, 'balance')
  const wingBalance = balances.find((b) => b.id === wing)?.balance ?? 0
  const paid = rows.filter((r) => r.status === 'paid')
  const due = rows.filter((r) => r.status === 'due')
  const income = sum(list.filter((x) => x.type === 'income'))
  const expense = sum(list.filter((x) => x.type === 'expense'))
  const wingLabel = wings.find((w) => w.id === wing)?.name || ''

  const exportCsv = () => {
    downloadCsv(`accounts-${wingLabel}-${period}.csv`, [
      ['Month', 'Type', 'Unit / Category', 'Owner / Description', 'Amount', 'Status', 'Date', 'Mode'],
      ...rows.filter((r) => r.status !== 'none').map((r) => [period, 'Maintenance', r.number, r.ownerName, r.amount, r.status === 'paid' ? 'Paid' : 'Pending', r.paidOn, r.mode]),
      ...list.map((x) => [period, x.type === 'income' ? 'Income' : 'Expense', x.category, x.description, x.amount, x.wingId ? '' : 'Common', x.date, x.mode]),
    ])
    toast.info(t('downloaded'))
  }

  if (unitsLoading) return <Spinner />
  if (!wings.length) return <EmptyState icon={Building2} title={t('mo.noUnits')} />

  return (
    <>
      {/* Sticky summary: wing tabs, balance, the month in four figures */}
      <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-3 shrink-0 space-y-2 bg-bg/95 px-4 pb-2.5 pt-2.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none">
        {wings.length > 1 && (
          <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto">
            {wings.map((w) => (
              <button key={w.id} type="button" onClick={() => setWing(w.id)}
                className={cx('h-9 shrink-0 snap-start rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  wing === w.id ? 'bg-accent text-white shadow-sm' : 'border border-fg/10 bg-surface text-muted hover:text-fg')}>
                {w.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-white shadow-sm">
          <Wallet className="size-5 shrink-0 opacity-90" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold opacity-85">{t('dash.total')}</p>
            {wings.length > 1 && <p className="truncate text-[0.6875rem] opacity-75">{wingLabel}: {lb ? '—' : inr(wingBalance)}</p>}
          </div>
          <p className="shrink-0 text-xl font-bold">{lb ? '—' : <AnimatedNumber value={total} />}</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <Figure label={t('mo.collectedShort')} value={sum(paid)} tone="text-ok" />
          <Figure label={t('mo.pending')} value={sum(due)} tone={due.length ? 'text-bad' : 'text-fg'} />
          <Figure label={t('income')} value={income} tone="text-ok" />
          <Figure label={t('expense')} value={expense} tone="text-bad" />
        </div>
      </div>

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:gap-4">
        {/* Maintenance: every flat and shop, floor by floor */}
        <ScrollCard className="lg:col-span-3" bodyClass="p-2.5 sm:p-3"
          header={isAdmin && canEdit(wing) && (
            <div className="flex shrink-0 items-center gap-2 px-2.5 pt-2.5 sm:px-3 sm:pt-3">
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-muted">{t('mo.paidOf', { a: paid.length, b: paid.length + due.length })}</p>
              <IconButton icon={CalendarCog} label={t('bills.button')} variant="secondary" size="sm" className="size-9" onClick={() => forms.open('bills', { period })} />
              <Button size="sm" variant="success" icon={Plus} onClick={() => forms.open('collect', { period })}>{t('collect.short')}</Button>
            </div>
          )}>
          {l1 ? <SkeletonList /> : !rows.length ? (
            <EmptyState icon={Layers} title={t('mo.noUnits')} />
          ) : (
            <div className="space-y-2.5">
              {byFloor(rows).map((f, fi) => {
                const c = FLOOR_COLORS[fi % FLOOR_COLORS.length]
                return (
                  <div key={f.key} className={cx('rounded-xl border-l-4 p-2', c.band)}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className={cx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold text-white', c.pill)}>
                        {f.key === 'shop' ? <Store className="size-3.5" /> : <Layers className="size-3.5" />}
                        {f.key === 'shop' ? t('shops') : f.key === 'other' ? t('mo.others') : t('mo.floor', { n: f.key })}
                      </span>
                      <span className="text-xs font-semibold text-muted">{t('mo.paidOf', { a: f.items.filter((r) => r.status === 'paid').length, b: f.items.filter((r) => r.status !== 'none').length })}</span>
                    </div>
                    <div className="space-y-1.5">
                      {f.items.map((r, i) => <UnitRow key={r.id} row={r} index={i} editable={canEdit(r.wingId)}
                        onClick={() => forms.open('payment', { due: r.due, unit: r.unit, period })} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollCard>

        {/* Other income and expenses: this wing's and the whole building's */}
        <ScrollCard className="lg:col-span-2"
          header={(
            <div className="flex shrink-0 items-center gap-2 px-4 pb-1 pt-3">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-muted">{t('mo.entries')}</h2>
              {isAdmin && <Button size="sm" icon={Plus} onClick={() => forms.open('entry', { type: 'expense', period, wingId: wing })}>{t('add')}</Button>}
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
                    className={cx('flex items-center gap-3 px-4 py-2.5 transition-colors', editable && 'cursor-pointer hover:bg-fg/[0.06]')}>
                    <IconTile icon={categoryIcon(x.category)} tone={isIn ? 'green' : 'red'} className="size-9" iconClass="size-[1.125rem]" />
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1.5 font-semibold text-fg">
                        <span className="truncate">{tv(x.category)}</span>
                        {!x.wingId && <Badge color="gray">{t('common')}</Badge>}
                      </p>
                      <p className="truncate text-xs text-muted">{[shortDate(x.date), x.description].filter(Boolean).join(' · ')}</p>
                    </div>
                    <p className={cx('shrink-0 font-bold', isIn ? 'text-ok' : 'text-fg')}>{isIn ? '+' : '−'}{inr(x.amount)}</p>
                  </motion.div>
                )
              })}
            </div>
          )}
        </ScrollCard>
      </div>

      {/* Month switcher, pinned just above the bottom menu */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 mt-3 flex shrink-0 items-center gap-2 border-t border-bar-line bg-bar px-4 py-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-0 lg:mt-4 lg:rounded-xl lg:border lg:px-2">
        <MonthPicker value={period} onChange={setPeriod} className="h-10 min-w-0 flex-1" />
        <IconButton icon={Download} label={t('exportCsv')} variant="secondary" className="size-10" onClick={exportCsv} />
      </div>
    </>
  )
}

/** Each floor gets its own colour band so flats are easy to tell apart */
const FLOOR_COLORS = [
  { band: 'border-sky-500/70 bg-sky-500/[0.06]', pill: 'bg-sky-600', text: 'text-sky-600 dark:text-sky-400' },
  { band: 'border-violet-500/70 bg-violet-500/[0.06]', pill: 'bg-violet-600', text: 'text-violet-600 dark:text-violet-400' },
  { band: 'border-amber-500/70 bg-amber-500/[0.06]', pill: 'bg-amber-600', text: 'text-amber-600 dark:text-amber-400' },
  { band: 'border-teal-500/70 bg-teal-500/[0.06]', pill: 'bg-teal-600', text: 'text-teal-600 dark:text-teal-400' },
  { band: 'border-pink-500/70 bg-pink-500/[0.06]', pill: 'bg-pink-600', text: 'text-pink-600 dark:text-pink-400' },
  { band: 'border-lime-500/70 bg-lime-500/[0.06]', pill: 'bg-lime-600', text: 'text-lime-600 dark:text-lime-400' },
]

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
    <div className="min-w-0 rounded-lg border border-fg/10 bg-surface px-2 py-1.5">
      <p className="truncate text-[0.6875rem] font-semibold text-muted">{label}</p>
      <p className={cx('truncate text-sm font-bold', tone)}>{inr(value)}</p>
    </div>
  )
}

/** One slim full-width row per flat: number, owner, amount, paid date or pending */
function UnitRow({ row: r, index, editable, onClick }) {
  const paid = r.status === 'paid'
  const due = r.status === 'due'
  return (
    <motion.button type="button" disabled={!editable} onClick={onClick}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 20) * 0.012 }}
      className={cx('flex w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-default',
        paid ? 'border-ok/25 bg-ok/[0.07] enabled:hover:bg-ok/[0.13]' : due ? 'border-bad/25 bg-bad/[0.06] enabled:hover:bg-bad/[0.12]' : 'border-fg/10 bg-fg/[0.03] enabled:hover:bg-fg/[0.07]',
        editable && 'cursor-pointer')}>
      <span className="w-16 shrink-0 truncate font-bold text-fg">{r.number}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted">{r.ownerName.split(' ')[0] || '—'}</span>
      <span className={cx('shrink-0 text-sm font-bold', paid ? 'text-ok' : due ? 'text-fg' : 'text-subtle')}>{inr(r.amount)}</span>
      <span className={cx('flex w-[4.75rem] shrink-0 items-center justify-end gap-1 text-xs font-semibold', paid ? 'text-ok' : due ? 'text-bad' : 'text-subtle')}>
        {paid && <CheckCircle2 className="size-3.5 shrink-0" />}
        <span className="truncate">{paid ? (r.paidOn ? shortDate(r.paidOn) : t('paid')) : due ? t('unpaid') : t('mo.notDue')}</span>
      </span>
    </motion.button>
  )
}
