import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { Download, Plus, CheckCircle2, CalendarCog, Store, Wallet, Layers, LayoutGrid, Rows3 } from 'lucide-react'
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
import { AnimatedNumber, Button, Card, EmptyState, IconButton, IconTile, ScrollCard, Segmented, SkeletonList, SkeletonTiles, Spinner, cx, toast } from '../components/ui'
import { MonthPicker } from '../components/filters'
import { forms } from '../components/forms'

/**
 * The main screen. Wing tabs on top, the balance, then one month at a time:
 * every flat's maintenance and that month's other income and expenses.
 * Accounts are usually settled a month later, so last month opens first.
 */
export default function Monthly() {
  const { profile, isAdmin, canEdit } = useAuth()
  const { units, wings, wingName, loading: unitsLoading } = useData()
  const [period, setPeriod] = useState(defaultPeriod())
  const [wing, setWing] = useState(profile?.role === 'wing_admin' ? profile.wingId : '') // '' all · 'common' · wing id
  const [view, setViewState] = useState(() => { try { return localStorage.getItem('flatView') || 'grid' } catch { return 'grid' } })
  const setView = (v) => { setViewState(v); try { localStorage.setItem('flatView', v) } catch { /* storage unavailable */ } }
  const months = useMemo(() => [period], [period])

  const { rows: balances, loading: lb } = useBalances(unitsLoading ? [] : wings)
  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', '==', period)), [period])
  const { data: entries, loading: l2 } = useEntries(months)

  const inTab = (wingId) => !wing || (wing === 'common' ? !wingId : wingId === wing)
  const rows = useMemo(() => monthDues(units, dues, period).filter((r) => wing !== 'common' && (!wing || r.wingId === wing)), [units, dues, period, wing])
  const groups = wings.map((w) => ({ wing: w, items: rows.filter((r) => r.wingId === w.id) })).filter((g) => g.items.length)
  const list = useMemo(() => entries.filter((x) => inTab(x.wingId)).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, wing])

  const shownBalances = balances.filter((b) => inTab(b.id))
  const balance = sum(shownBalances, 'balance')
  const paid = rows.filter((r) => r.status === 'paid')
  const due = rows.filter((r) => r.status === 'due')
  const income = sum(list.filter((x) => x.type === 'income'))
  const expense = sum(list.filter((x) => x.type === 'expense'))
  const canCollect = wings.some((w) => canEdit(w.id))
  const tabs = [{ value: '', label: t('allWings') }, ...wings.map((w) => ({ value: w.id, label: w.name })), { value: 'common', label: t('common') }]

  const exportCsv = () => {
    downloadCsv(`accounts-${period}.csv`, [
      ['Month', 'Type', 'Wing', 'Unit / Category', 'Owner / Description', 'Amount', 'Status', 'Date', 'Mode'],
      ...rows.filter((r) => r.status !== 'none').map((r) => [period, 'Maintenance', wingName(r.wingId), r.number, r.ownerName, r.amount, r.status === 'paid' ? 'Paid' : 'Pending', r.paidOn, r.mode]),
      ...list.map((x) => [period, x.type === 'income' ? 'Income' : 'Expense', wingName(x.wingId), x.category, x.description, x.amount, '', x.date, x.mode]),
    ])
    toast.info(t('downloaded'))
  }

  if (unitsLoading) return <Spinner />

  return (
    <>
      {/* Wing tabs: stay on top while scrolling, swipe sideways when there are many */}
      <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-3 shrink-0 bg-bg/90 px-4 pb-2 pt-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-0 lg:bg-transparent lg:p-0 lg:pb-3 lg:backdrop-blur-none">
        <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto">
          {tabs.map((o) => (
            <button key={o.value} type="button" onClick={() => setWing(o.value)}
              className={cx('h-10 shrink-0 snap-start rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer',
                wing === o.value ? 'bg-accent text-white shadow-sm' : 'border border-fg/10 bg-surface text-muted hover:text-fg')}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Balance (all time) and this month's figures */}
      <Card className="@container mb-3 shrink-0 p-4 lg:mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-muted">{t('dash.total')}{wing && ` · ${wing === 'common' ? t('common') : wingName(wing)}`}</p>
            <p className={cx('truncate text-3xl font-bold tracking-tight', balance < 0 ? 'text-bad' : 'text-fg')}>
              {lb ? <span className="shimmer inline-block h-8 w-36 rounded-lg" /> : <AnimatedNumber value={balance} />}
            </p>
          </div>
          <IconTile icon={Wallet} tone="indigo" className="size-11" iconClass="size-6" />
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-fg/10 pt-3">
          <MonthPicker value={period} onChange={setPeriod} className="min-w-0 flex-1" />
          <IconButton icon={Download} label={t('exportCsv')} variant="secondary" onClick={exportCsv} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 @min-[36rem]:grid-cols-4">
          {wing !== 'common' && <Figure label={t('mo.collected')} value={sum(paid)} tone="text-ok" sub={t('mo.paidOf', { a: paid.length, b: paid.length + due.length })} />}
          {wing !== 'common' && <Figure label={t('mo.pending')} value={sum(due)} tone={due.length ? 'text-bad' : 'text-fg'} sub={t('mo.flatsLeft', { n: due.length })} />}
          <Figure label={t('a.otherIncome')} value={income} tone="text-ok" />
          <Figure label={t('expenses')} value={expense} tone="text-bad" />
        </div>
      </Card>

      <div className={cx('grid gap-3 lg:min-h-0 lg:flex-1 lg:gap-4', wing !== 'common' && 'lg:grid-cols-5')}>
        {/* Maintenance: every flat and shop, floor by floor */}
        {wing !== 'common' && (
          <ScrollCard className="lg:col-span-3" bodyClass="px-3 pb-3 sm:px-4 sm:pb-4"
            header={(
              <div className="flex shrink-0 items-center gap-2 p-3 sm:p-4">
                <Segmented value={view} onChange={setView} className="h-10 min-w-0" options={[
                  { value: 'grid', label: <span className="flex items-center gap-1.5"><LayoutGrid className="size-4" />{t('mo.viewTiles')}</span> },
                  { value: 'list', label: <span className="flex items-center gap-1.5"><Rows3 className="size-4" />{t('mo.viewList')}</span> },
                ]} />
                {isAdmin && canCollect && <div className="ml-auto flex shrink-0 items-center gap-2">
                  <IconButton icon={CalendarCog} label={t('bills.button')} variant="secondary" size="sm" className="size-10" onClick={() => forms.open('bills', { period })} />
                  <Button size="sm" variant="success" icon={Plus} className="h-10" onClick={() => forms.open('collect', { period })}>{t('collect.short')}</Button>
                </div>}
              </div>
            )}>
            {l1 ? <SkeletonTiles /> : !groups.length ? (
              <EmptyState icon={Layers} title={t('mo.noUnits')} />
            ) : (
              <div className="space-y-5">
                {groups.map(({ wing: w, items }) => {
                  const left = items.filter((r) => r.status === 'due')
                  return (
                    <section key={w.id}>
                      {groups.length > 1 && (
                        <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
                          <h3 className="truncate text-base font-bold text-fg">{w.name}</h3>
                          {left.length > 0 && <span className="shrink-0 text-xs font-semibold text-bad">{inr(sum(left))} {t('unpaid')}</span>}
                        </div>
                      )}
                      <div className="space-y-2.5">
                        {byFloor(items).map((f, fi) => {
                          const c = FLOOR_COLORS[fi % FLOOR_COLORS.length]
                          return (
                            <div key={f.key} className={cx('rounded-xl border-l-4 p-2 sm:p-2.5', c.band)}>
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className={cx('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold text-white', c.pill)}>
                                  {f.key === 'shop' ? <Store className="size-4" /> : <Layers className="size-4" />}
                                  {f.key === 'shop' ? t('shops') : f.key === 'other' ? t('mo.others') : t('mo.floor', { n: f.key })}
                                </span>
                                <span className="text-xs font-semibold text-muted">{t('mo.paidOf', { a: f.items.filter((r) => r.status === 'paid').length, b: f.items.filter((r) => r.status !== 'none').length })}</span>
                              </div>
                              {view === 'list' ? (
                                <div className="space-y-1.5">
                                  {f.items.map((r, i) => <UnitRow key={r.id} row={r} index={i} editable={canEdit(r.wingId)}
                                    onClick={() => forms.open('payment', { due: r.due, unit: r.unit, period })} />)}
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]">
                                  {f.items.map((r, i) => <UnitTile key={r.id} row={r} index={i} editable={canEdit(r.wingId)}
                                    onClick={() => forms.open('payment', { due: r.due, unit: r.unit, period })} />)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </ScrollCard>
        )}

        {/* Other income and expenses for the month */}
        <ScrollCard className={cx(wing !== 'common' && 'lg:col-span-2')}
          header={(
            <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-muted">{t('mo.entries')}</h2>
              {isAdmin && <Button size="sm" icon={Plus} className="h-10" onClick={() => forms.open('entry', { type: 'expense', period, wingId: wing === 'common' ? '' : wing || undefined })}>{t('add')}</Button>}
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
                    className={cx('flex items-center gap-3 px-4 py-3 transition-colors', editable && 'cursor-pointer hover:bg-fg/[0.06]')}>
                    <IconTile icon={categoryIcon(x.category)} tone={isIn ? 'green' : 'red'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-fg">{tv(x.category)}</p>
                      <p className="truncate text-xs text-muted">{[shortDate(x.date), !wing && wingName(x.wingId), x.description].filter(Boolean).join(' · ')}</p>
                    </div>
                    <p className={cx('shrink-0 font-bold', isIn ? 'text-ok' : 'text-fg')}>{isIn ? '+' : '−'}{inr(x.amount)}</p>
                  </motion.div>
                )
              })}
            </div>
          )}
        </ScrollCard>
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

function Figure({ label, value, tone, sub }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-semibold text-muted">{label}</p>
      <p className={cx('truncate text-lg font-bold sm:text-xl', tone)}>{inr(value)}</p>
      {sub && <p className="truncate text-xs text-subtle">{sub}</p>}
    </div>
  )
}

/** List view: one slim full-width row per flat */
function UnitRow({ row: r, index, editable, onClick }) {
  const paid = r.status === 'paid'
  const due = r.status === 'due'
  return (
    <motion.button type="button" disabled={!editable} onClick={onClick}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 20) * 0.012 }}
      className={cx('flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-default',
        paid ? 'border-ok/25 bg-ok/[0.07] enabled:hover:bg-ok/[0.13]' : due ? 'border-bad/25 bg-bad/[0.06] enabled:hover:bg-bad/[0.12]' : 'border-fg/10 bg-fg/[0.03] enabled:hover:bg-fg/[0.07]',
        editable && 'cursor-pointer')}>
      <span className="w-[4.5rem] shrink-0 truncate font-bold text-fg">{r.number}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted">{r.ownerName.split(' ')[0] || '—'}</span>
      <span className={cx('shrink-0 text-sm font-bold', paid ? 'text-ok' : due ? 'text-fg' : 'text-subtle')}>{inr(r.amount)}</span>
      <span className={cx('flex w-[4.75rem] shrink-0 items-center justify-end gap-1 text-xs font-semibold', paid ? 'text-ok' : due ? 'text-bad' : 'text-subtle')}>
        {paid && <CheckCircle2 className="size-3.5 shrink-0" />}
        <span className="truncate">{paid ? (r.paidOn ? shortDate(r.paidOn) : t('paid')) : due ? t('unpaid') : t('mo.notDue')}</span>
      </span>
    </motion.button>
  )
}

/** A flat / shop for the month: number, owner, amount and when it was paid */
function UnitTile({ row: r, index, editable, onClick }) {
  const paid = r.status === 'paid'
  const due = r.status === 'due'
  return (
    <motion.button type="button" disabled={!editable} onClick={onClick}
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(index, 20) * 0.012 }}
      whileTap={editable ? { scale: 0.95 } : undefined}
      className={cx('flex min-w-0 flex-col items-start rounded-xl border p-2.5 text-left transition-colors disabled:cursor-default sm:p-3',
        paid ? 'border-ok/25 bg-ok/[0.07] enabled:hover:bg-ok/[0.13]' : due ? 'border-bad/25 bg-bad/[0.06] enabled:hover:bg-bad/[0.12]' : 'border-fg/10 bg-fg/[0.03] enabled:hover:bg-fg/[0.07]',
        editable && 'cursor-pointer')}>
      <span className="flex w-full items-center justify-between gap-1">
        <span className="truncate text-sm font-bold text-fg">{r.number}</span>
        {r.type === 'shop' && <Store className="size-3.5 shrink-0 text-warn" />}
      </span>
      <span className="w-full truncate text-xs text-muted">{r.ownerName.split(' ')[0] || '—'}</span>
      <span className={cx('mt-1.5 text-[0.9375rem] font-bold', paid ? 'text-ok' : due ? 'text-fg' : 'text-subtle')}>{inr(r.amount)}</span>
      <span className={cx('mt-0.5 flex w-full min-w-0 items-center gap-1 text-xs font-semibold', paid ? 'text-ok' : due ? 'text-bad' : 'text-subtle')}>
        {paid && <CheckCircle2 className="size-3.5 shrink-0" />}
        <span className="truncate">{paid ? (r.paidOn ? shortDate(r.paidOn) : t('paid')) : due ? t('unpaid') : t('mo.notDue')}</span>
      </span>
    </motion.button>
  )
}
