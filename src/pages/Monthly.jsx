import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { Download, Plus, CheckCircle2, CalendarCog, Store, Wallet, ReceiptIndianRupee, Layers } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { useEntries } from '../hooks/useEntries'
import { inr, sum, currentPeriod, shortDate, downloadCsv } from '../lib/format'
import { monthDues } from '../lib/ledger'
import { categoryIcon } from '../lib/icons'
import { t, tv } from '../i18n'
import { Button, Card, EmptyState, IconButton, IconTile, PageHeader, ScrollCard, SkeletonList, SkeletonTiles, Spinner, cx, toast } from '../components/ui'
import { MonthPicker } from '../components/filters'
import { forms } from '../components/forms'

/** One screen per month: every flat's maintenance, plus that month's other income and expenses */
export default function Monthly() {
  const { isAdmin, canEdit } = useAuth()
  const { units, wings, wingName, loading: unitsLoading } = useData()
  const [period, setPeriod] = useState(currentPeriod())
  const months = useMemo(() => [period], [period])

  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', '==', period)), [period])
  const { data: entries, loading: l2 } = useEntries(months)

  const rows = useMemo(() => monthDues(units, dues, period), [units, dues, period])
  const groups = wings.map((w) => ({ wing: w, items: rows.filter((r) => r.wingId === w.id) })).filter((g) => g.items.length)
  const list = useMemo(() => [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [entries])

  const paid = rows.filter((r) => r.status === 'paid')
  const due = rows.filter((r) => r.status === 'due')
  const income = sum(entries.filter((x) => x.type === 'income'))
  const expense = sum(entries.filter((x) => x.type === 'expense'))
  const balance = sum(paid) + income - expense
  const canCollect = wings.some((w) => canEdit(w.id))

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
      <PageHeader title={t('nav.month')} subtitle={t('mo.subtitle')}
        actions={<>
          <MonthPicker value={period} onChange={setPeriod} />
          <IconButton icon={Download} label={t('exportCsv')} variant="secondary" onClick={exportCsv} />
        </>} />

      {/* Month totals */}
      <Card className="@container mb-3 shrink-0 p-4 lg:mb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 @min-[40rem]:grid-cols-5">
          <Figure label={t('mo.collected')} value={sum(paid)} tone="text-ok" sub={t('mo.paidOf', { a: paid.length, b: paid.length + due.length })} />
          <Figure label={t('mo.pending')} value={sum(due)} tone={due.length ? 'text-bad' : 'text-fg'} sub={t('mo.flatsLeft', { n: due.length })} />
          <Figure label={t('a.otherIncome')} value={income} tone="text-ok" />
          <Figure label={t('expenses')} value={expense} tone="text-bad" />
          <div className="col-span-2 border-t border-fg/10 pt-3 @min-[40rem]:col-span-1 @min-[40rem]:border-0 @min-[40rem]:pt-0">
            <Figure label={t('mo.balance')} value={balance} tone={balance < 0 ? 'text-bad' : 'text-fg'} sub={t('mo.balanceSub')} />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:gap-4">
        {/* Maintenance: every flat and shop, paid or not */}
        <ScrollCard className="lg:col-span-3" bodyClass="px-3 pb-3 sm:px-4 sm:pb-4"
          header={<CardHead icon={ReceiptIndianRupee} title={t('mo.maintenance')}
            actions={isAdmin && canCollect && <>
              <IconButton icon={CalendarCog} label={t('bills.button')} variant="secondary" size="sm" className="size-9" onClick={() => forms.open('bills', { period })} />
              <Button size="sm" variant="success" icon={Plus} onClick={() => forms.open('collect', { period })}>{t('collect.button')}</Button>
            </>} />}>
          {l1 ? <SkeletonTiles /> : !groups.length ? (
            <EmptyState icon={ReceiptIndianRupee} title={t('mo.noUnits')} />
          ) : (
            <div className="space-y-5">
              {groups.map(({ wing: w, items }) => {
                const left = items.filter((r) => r.status === 'due')
                return (
                  <section key={w.id}>
                    {groups.length > 1 && (
                      <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
                        <h3 className="truncate text-sm font-semibold text-fg">{w.name}</h3>
                        <span className="shrink-0 text-xs text-muted">
                          {t('mo.paidOf', { a: items.filter((r) => r.status === 'paid').length, b: items.filter((r) => r.status !== 'none').length })}
                          {left.length > 0 && <span className="text-bad"> · {inr(sum(left))} {t('unpaid')}</span>}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2.5">
                      {byFloor(items).map((f, fi) => {
                        const c = FLOOR_COLORS[fi % FLOOR_COLORS.length]
                        return (
                          <div key={f.key} className={cx('rounded-xl border-l-4 p-1.5 sm:p-2.5', c.band)}>
                            <p className={cx('mb-1.5 flex items-center gap-1.5 px-0.5 text-xs font-bold', c.text)}>
                              {f.key === 'shop' ? <Store className="size-3.5" /> : <Layers className="size-3.5" />}
                              {f.key === 'shop' ? t('shops') : f.key === 'other' ? t('mo.others') : t('mo.floor', { n: f.key })}
                              <span className="font-medium text-muted">· {t('mo.paidOf', { a: f.items.filter((r) => r.status === 'paid').length, b: f.items.filter((r) => r.status !== 'none').length })}</span>
                            </p>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] sm:gap-2">
                              {f.items.map((r, i) => <UnitTile key={r.id} row={r} index={i} editable={canEdit(r.wingId)}
                                onClick={() => forms.open('payment', { due: r.due, unit: r.unit, period })} />)}
                            </div>
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

        {/* Other income and expenses for the month */}
        <ScrollCard className="lg:col-span-2"
          header={<CardHead icon={Wallet} title={t('mo.entries')}
            actions={isAdmin && <Button size="sm" icon={Plus} onClick={() => forms.open('entry', { type: 'expense', period })}>{t('add')}</Button>} />}>
          {l2 ? <SkeletonList /> : !list.length ? (
            <EmptyState icon={Wallet} title={t('a.empty')} text={isAdmin ? t('a.emptyAdmin') : t('a.emptyViewer')} />
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
                      <p className="truncate text-xs text-muted">{[shortDate(x.date), wingName(x.wingId), x.description].filter(Boolean).join(' · ')}</p>
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
  { band: 'border-sky-500/70 bg-sky-500/[0.06]', text: 'text-sky-600 dark:text-sky-400' },
  { band: 'border-violet-500/70 bg-violet-500/[0.06]', text: 'text-violet-600 dark:text-violet-400' },
  { band: 'border-amber-500/70 bg-amber-500/[0.06]', text: 'text-amber-600 dark:text-amber-400' },
  { band: 'border-teal-500/70 bg-teal-500/[0.06]', text: 'text-teal-600 dark:text-teal-400' },
  { band: 'border-pink-500/70 bg-pink-500/[0.06]', text: 'text-pink-600 dark:text-pink-400' },
  { band: 'border-lime-500/70 bg-lime-500/[0.06]', text: 'text-lime-600 dark:text-lime-400' },
]

/** Group a wing's units by floor: "A-203" → floor 2, shops together, anything else under "others" */
function byFloor(items) {
  const groups = new Map()
  for (const r of items) {
    const n = Number(String(r.number).match(/(\d+)\s*$/)?.[1])
    const key = r.type === 'shop' ? 'shop' : n >= 100 ? String(Math.floor(n / 100)) : 'other'
    groups.set(key, [...(groups.get(key) || []), r])
  }
  const order = (k) => (k === 'shop' ? -1 : k === 'other' ? 1e9 : Number(k))
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

function CardHead({ icon: Icon, title, actions }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 px-4 pb-3 pt-4">
      <Icon className="size-5 shrink-0 text-accent-ink" />
      <h2 className="min-w-0 flex-1 truncate font-semibold text-fg">{title}</h2>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
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
