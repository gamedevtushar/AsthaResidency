import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { Wallet, Clock, ArrowUpCircle, Scale, ArrowRight, ReceiptIndianRupee, Plus, Sparkles } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { inr, sum, currentPeriod, lastPeriods, periodLabel, periodRange, dateLabel } from '../lib/format'
import { categoryIcon } from '../lib/icons'
import { Card, EmptyState, IconTile, PageHeader, Progress, Ring, StatCard, cx } from '../components/ui'
import { WingSelect, matchWing } from '../components/filters'
import { forms } from '../components/forms'
import { t, tv } from '../i18n'

const fmtShort = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const { wings, wingName } = useData()
  const [wing, setWing] = useState(profile?.role === 'wing_admin' ? profile.wingId : '')
  const now = currentPeriod()
  const periods = useMemo(() => lastPeriods(6), [])
  const [from, to] = periodRange(periods[0], now)

  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', 'in', periods)), [])
  const { data: txns, loading: l2 } = useQuery(
    () => query(collection(db, 'transactions'), where('date', '>=', from), where('date', '<=', to)), [])
  const loading = l1 || l2

  const d = useMemo(() => {
    const D = dues.filter((x) => !wing || x.wingId === wing)
    // A selected wing excludes common (building) entries
    const T = txns.filter((x) => (wing ? x.wingId === wing : true))
    const monthOf = (x) => x.date.slice(0, 7)
    const chart = periods.map((p) => {
      const pt = T.filter((x) => monthOf(x) === p)
      return {
        p,
        income: sum(D.filter((x) => x.period === p && x.status === 'paid')) + sum(pt.filter((x) => x.type === 'income')),
        expense: sum(pt.filter((x) => x.type === 'expense')),
      }
    })
    const cur = D.filter((x) => x.period === now)
    const curT = T.filter((x) => monthOf(x) === now)
    const collected = sum(cur.filter((x) => x.status === 'paid'))
    const billed = sum(cur)
    return {
      chart, collected, billed,
      rate: billed ? Math.round((collected / billed) * 100) : 0,
      paidCount: cur.filter((x) => x.status === 'paid').length,
      unitCount: cur.length,
      pendingAll: sum(D.filter((x) => x.status === 'unpaid')),
      pendingAllCount: D.filter((x) => x.status === 'unpaid').length,
      otherIncome: sum(curT.filter((x) => x.type === 'income')),
      expense: sum(curT.filter((x) => x.type === 'expense')),
      net6: chart.reduce((s, c) => s + c.income - c.expense, 0),
      recent: [...T].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
      byWing: wings.filter((w) => matchWing(wing, w.id)).map((w) => {
        const wd = cur.filter((x) => x.wingId === w.id)
        return { ...w, billed: sum(wd), collected: sum(wd.filter((x) => x.status === 'paid')) }
      }),
    }
  }, [dues, txns, wing, wings, periods, now])

  const max = Math.max(1, ...d.chart.flatMap((c) => [c.income, c.expense]))

  return (
    <>
      <PageHeader title={profile?.name ? t('dash.hello', { name: profile.name.split(' ')[0] }) : t('dash.welcome')} subtitle={t('dash.overview', { month: periodLabel(now) })}
        actions={wings.length > 1 && <WingSelect value={wing} onChange={setWing} />} />

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4">
        {/* Hero: this month's collection */}
        <Card className="relative overflow-hidden p-5 lg:col-span-6 xl:col-span-7">
          <div className="relative flex items-center gap-5">
            <Ring value={loading ? 0 : d.rate} size={124} stroke={12}>
              <span className="text-2xl font-bold text-fg">{loading ? '—' : `${d.rate}%`}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted">{t('dash.rate')}</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-ink">{t('dash.collected')}</p>
              <p className="mt-1 truncate text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                {loading ? <span className="shimmer inline-block h-9 w-40 rounded-lg" /> : inr(d.collected)}
              </p>
              <p className="mt-1 truncate text-sm text-muted">{t('dash.collectedOf', { a: t('dash.unitsPaid', { a: d.paidCount, b: d.unitCount }), b: inr(d.billed) })}</p>
              {isAdmin && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => forms.open('collect')}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 cursor-pointer">
                    <ReceiptIndianRupee className="size-4" />{t('dash.quickBills')}
                  </motion.button>
                  <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => forms.open('entry', { type: 'expense' })}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-fg/15 bg-fg/10 px-4 text-sm font-semibold text-fg backdrop-blur-md transition hover:bg-fg/15 cursor-pointer">
                    <Plus className="size-4" />{t('a.addExpense')}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 2 × 2 stats */}
        <div className="grid grid-cols-2 gap-3 lg:col-span-6 lg:gap-4 xl:col-span-5">
          <StatCard label={t('dash.collected')} amount={d.collected} sub={t('dash.unitsPaid', { a: d.paidCount, b: d.unitCount })} icon={Wallet} tone="green" />
          <StatCard label={t('dash.pending')} amount={d.pendingAll} sub={t('dash.pendingSub', { n: d.pendingAllCount })} icon={Clock} tone="red" />
          <StatCard label={t('dash.expenses')} amount={d.expense} sub={d.otherIncome ? t('dash.otherIncome', { amt: inr(d.otherIncome) }) : t('dash.billsPayments')} icon={ArrowUpCircle} tone="amber" />
          <StatCard label={t('dash.net6')} amount={d.net6} sub={t('dash.netSub')} icon={Scale} tone="indigo" />
        </div>

        {/* Chart */}
        <Card className="flex flex-col p-5 lg:col-span-7 lg:min-h-0 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-fg">{t('dash.chart')}</h2>
            <div className="flex gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent" />{t('income')}</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-bad/70" />{t('expense')}</span>
            </div>
          </div>
          <div className="flex h-52 items-end gap-2 sm:gap-3 lg:h-auto lg:min-h-[140px] lg:flex-1">
            {d.chart.map((c, i) => (
              <div key={c.p} className="flex h-full flex-1 flex-col items-center">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  {[['income', 'bg-accent'], ['expense', 'bg-bad/70']].map(([k, color], j) => (
                    <div key={k} className="group relative flex h-full w-full max-w-6 items-end">
                      <motion.div className={cx('w-full rounded-t-md', color)}
                        initial={{ height: 0 }} animate={{ height: loading ? 0 : `${Math.max((c[k] / max) * 100, c[k] ? 2 : 0)}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.25 + i * 0.06 + j * 0.03 }} />
                      <span className="glass-strong pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] text-fg group-hover:block">{inr(c[k])}</span>
                    </div>
                  ))}
                </div>
                <p className={cx('mt-2 text-[11px]', c.p === now ? 'font-semibold text-fg' : 'text-muted')}>{periodLabel(c.p, true)}</p>
                <p className="hidden text-[10px] text-subtle sm:block">{fmtShort(c.income)}/{fmtShort(c.expense)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Wing collection */}
        <Card className="flex flex-col p-5 lg:col-span-5 lg:min-h-0 xl:col-span-3">
          <h2 className="mb-4 font-semibold text-fg">{t('dash.byWing')}</h2>
          <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto">
            {d.byWing.length === 0 ? <p className="text-sm text-muted">{t('dash.noWings')}</p> : d.byWing.map((w) => {
              const pct = w.billed ? Math.round((w.collected / w.billed) * 100) : 0
              return (
                <div key={w.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-fg">{w.name}</span>
                    <span className={cx('font-semibold', pct >= 80 ? 'text-ok' : pct >= 40 ? 'text-warn' : 'text-muted')}>{w.billed ? `${pct}%` : t('dash.notBilled')}</span>
                  </div>
                  <Progress value={pct} tone={pct >= 80 ? 'green' : 'indigo'} />
                  <p className="mt-1.5 text-xs text-subtle">{t('dash.ofAmount', { a: inr(w.collected), b: inr(w.billed) })}</p>
                </div>
              )
            })}
          </div>
          <Link to="/maintenance" className="group mt-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent-ink hover:text-accent-ink">
            {t('dash.viewMaint')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Card>

        {/* Recent (hidden on mid-size desktop so everything fits one screen) */}
        <Card className="flex flex-col overflow-hidden lg:hidden xl:col-span-4 xl:flex xl:min-h-0">
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5">
            <h2 className="font-semibold text-fg">{t('dash.recent')}</h2>
            <Link to="/accounts" className="text-sm font-medium text-accent-ink hover:text-accent-ink">{t('viewAll')}</Link>
          </div>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
            {loading ? null : d.recent.length === 0 ? <EmptyState icon={Sparkles} title={t('dash.noEntries')} /> : d.recent.map((x, i) => (
              <motion.div key={x.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-center gap-3 px-5 py-2.5">
                <IconTile icon={categoryIcon(x.category)} tone={x.type === 'income' ? 'green' : 'red'} className="size-9" iconClass="size-4" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{tv(x.category)}</p>
                  <p className="truncate text-xs text-subtle">{dateLabel(x.date)} · {wingName(x.wingId)}</p>
                </div>
                <p className={cx('text-sm font-semibold', x.type === 'income' ? 'text-ok' : 'text-fg')}>{x.type === 'income' ? '+' : '−'}{inr(x.amount)}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
