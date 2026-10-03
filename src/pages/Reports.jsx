import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { Download, PartyPopper, CalendarRange } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { inr, sum, periodLabel, periodRange, downloadCsv, byNumber } from '../lib/format'
import { categoryIcon } from '../lib/icons'
import { Button, Card, EmptyState, IconTile, PageHeader, Progress, Segmented, Select, SkeletonList, cx, reveal, toast } from '../components/ui'
import { WingChips } from '../components/filters'
import { t, tv } from '../i18n'

/** Indian financial year: April → March */
const fyStart = () => { const d = new Date(); return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1 }
const fyPeriods = (y) => Array.from({ length: 12 }, (_, i) => {
  const m = ((3 + i) % 12) + 1
  return `${m >= 4 ? y : y + 1}-${String(m).padStart(2, '0')}`
})
const fyName = (y) => `${y}-${String(y + 1).slice(2)}`
const panel = 'glass flex min-h-[320px] flex-col overflow-hidden rounded-2xl lg:min-h-0'

export default function Reports() {
  const { profile } = useAuth()
  const { wingName } = useData()
  const [year, setYear] = useState(fyStart())
  const [wing, setWing] = useState(profile?.role === 'wing_admin' ? profile.wingId : '')
  const [tab, setTab] = useState('summary')
  const periods = useMemo(() => fyPeriods(year), [year])
  const [from, to] = periodRange(periods[0], periods[11])

  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', 'in', periods)), [year])
  const { data: txns, loading: l2 } = useQuery(
    () => query(collection(db, 'transactions'), where('date', '>=', from), where('date', '<=', to)), [year])

  const r = useMemo(() => {
    const D = dues.filter((x) => !wing || x.wingId === wing)
    const T = txns.filter((x) => !wing || x.wingId === wing)
    const rows = periods.map((p) => {
      const pd = D.filter((x) => x.period === p)
      const pt = T.filter((x) => x.date.startsWith(p))
      const row = {
        p,
        billed: sum(pd),
        collected: sum(pd.filter((x) => x.status === 'paid')),
        income: sum(pt.filter((x) => x.type === 'income')),
        expense: sum(pt.filter((x) => x.type === 'expense')),
      }
      row.net = row.collected + row.income - row.expense
      return row
    })
    const total = ['billed', 'collected', 'income', 'expense', 'net'].reduce((o, k) => ({ ...o, [k]: sum(rows, k) }), {})
    const cats = {}
    T.filter((x) => x.type === 'expense').forEach((x) => { cats[x.category] = (cats[x.category] || 0) + Number(x.amount) })
    const categories = Object.entries(cats).sort((a, b) => b[1] - a[1])
    const pend = {}
    D.filter((x) => x.status === 'unpaid').forEach((x) => {
      pend[x.unitId] ||= { number: x.number, wingId: x.wingId, ownerName: x.ownerName, months: [], amount: 0 }
      pend[x.unitId].months.push(x.period)
      pend[x.unitId].amount += Number(x.amount) || 0
    })
    const pending = Object.values(pend).sort((a, b) => b.amount - a.amount || byNumber(a, b))
    return { rows, total, categories, pending }
  }, [dues, txns, wing, periods])

  const exportCsv = () => {
    if (tab === 'summary') downloadCsv(`summary-FY${fyName(year)}.csv`, [
      ['Month', 'Maintenance billed', 'Maintenance collected', 'Other income', 'Expenses', 'Net'],
      ...r.rows.map((x) => [periodLabel(x.p), x.billed, x.collected, x.income, x.expense, x.net]),
      ['Total', r.total.billed, r.total.collected, r.total.income, r.total.expense, r.total.net],
    ])
    else downloadCsv(`pending-dues-FY${fyName(year)}.csv`, [
      ['Unit', 'Wing', 'Owner', 'Months', 'Amount'],
      ...r.pending.map((x) => [x.number, wingName(x.wingId), x.ownerName, x.months.map((m) => periodLabel(m, true)).join(' '), x.amount]),
    ])
    toast.info(t('downloaded'))
  }

  const years = Array.from({ length: 5 }, (_, i) => fyStart() - i)
  const maxCat = Math.max(1, ...r.categories.map((c) => c[1]))
  const loading = l1 || l2

  return (
    <>
      <PageHeader title={t('nav.reports')} subtitle={`${t('r.fy', { y: fyName(year) })} · ${wing ? wingName(wing) : t('r.whole')}`}
        actions={<>
          <Select size="sm" icon={CalendarRange} value={year} onChange={setYear} className="w-48"
            options={years.map((y) => ({ value: y, label: t('r.fy', { y: fyName(y) }) }))} />
          <Button variant="secondary" icon={Download} onClick={exportCsv}>{t('exportCsv')}</Button>
        </>} />

      <motion.div variants={reveal} className="mb-3 flex shrink-0 flex-col gap-2 lg:mb-4 xl:flex-row xl:items-center">
        <WingChips value={wing} onChange={setWing} className="xl:flex-1" />
        <Segmented value={tab} onChange={setTab}
          options={[{ value: 'summary', label: t('r.summary') }, { value: 'pending', label: t('r.pendingTab', { n: r.pending.length }) }]} />
      </motion.div>

      {loading ? <Card><SkeletonList rows={6} /></Card> : (
        <AnimatePresence mode="wait">
          {tab === 'summary' ? (
            <motion.div key="summary" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
              className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:gap-4">
              <div className={cx(panel, 'lg:col-span-2')}>
                <div className="no-scrollbar min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[580px] text-sm">
                    <thead className="sticky top-0 z-10 bg-surface/90 text-[11px] uppercase tracking-wider text-muted backdrop-blur-md">
                      <tr>
                        <th className="px-4 py-3.5 text-left font-medium">{t('r.month')}</th>
                        <th className="px-3 py-3.5 text-right font-medium">{t('r.billed')}</th>
                        <th className="px-3 py-3.5 text-right font-medium">{t('r.collected')}</th>
                        <th className="px-3 py-3.5 text-right font-medium">{t('r.otherInc')}</th>
                        <th className="px-3 py-3.5 text-right font-medium">{t('expenses')}</th>
                        <th className="px-4 py-3.5 text-right font-medium">{t('r.net')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fg/[0.05]">
                      {r.rows.map((x, i) => (
                        <motion.tr key={x.p} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="transition-colors hover:bg-fg/[0.04]">
                          <td className="px-4 py-3 font-medium text-fg">{periodLabel(x.p, true)}</td>
                          <td className="px-3 py-3 text-right text-muted">{inr(x.billed)}</td>
                          <td className="px-3 py-3 text-right text-ok">{inr(x.collected)}</td>
                          <td className="px-3 py-3 text-right text-muted">{inr(x.income)}</td>
                          <td className="px-3 py-3 text-right text-bad">{inr(x.expense)}</td>
                          <td className={cx('px-4 py-3 text-right font-semibold', x.net < 0 ? 'text-bad' : 'text-fg')}>{inr(x.net)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-surface/90 font-bold backdrop-blur-md">
                      <tr className="border-t border-fg/15">
                        <td className="px-4 py-3.5 text-fg">{t('r.total')}</td>
                        <td className="px-3 py-3.5 text-right text-muted">{inr(r.total.billed)}</td>
                        <td className="px-3 py-3.5 text-right text-ok">{inr(r.total.collected)}</td>
                        <td className="px-3 py-3.5 text-right text-fg">{inr(r.total.income)}</td>
                        <td className="px-3 py-3.5 text-right text-bad">{inr(r.total.expense)}</td>
                        <td className={cx('px-4 py-3.5 text-right', r.total.net < 0 ? 'text-bad' : 'text-fg')}>{inr(r.total.net)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className={cx(panel, 'p-5')}>
                <h2 className="mb-4 shrink-0 font-semibold text-fg">{t('r.byCategory')}</h2>
                <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto">
                  {r.categories.length === 0 ? <p className="text-sm text-muted">{t('r.noExpenses')}</p> : r.categories.map(([c, v]) => (
                    <div key={c} className="flex items-center gap-3">
                      <IconTile icon={categoryIcon(c)} tone="red" className="size-9" iconClass="size-4" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex justify-between gap-2 text-sm"><span className="truncate text-muted">{tv(c)}</span><span className="font-semibold text-fg">{inr(v)}</span></div>
                        <Progress value={(v / maxCat) * 100} tone="red" className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="pending" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
              className={cx(panel, 'lg:flex-1')}>
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
                {r.pending.length === 0 ? <EmptyState icon={PartyPopper} title={t('r.noPending')} text={t('r.noPendingText')} /> : (
                  <ul className="divide-y divide-fg/[0.06]">
                    {r.pending.map((x, i) => (
                      <motion.li key={`${x.wingId}-${x.number}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 14) * 0.03 }}
                        className="flex items-center gap-3 px-4 py-3">
                        <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-bad/15 text-bad ring-1 ring-inset ring-bad/25">
                          <span className="text-sm font-bold leading-none">{x.months.length}</span>
                          <span className="text-[9px] leading-none text-bad">{t('r.months')}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-fg">{x.number} <span className="text-xs font-normal text-subtle">{wingName(x.wingId)}</span></p>
                          <p className="truncate text-sm text-muted">{x.ownerName || '—'}</p>
                          <p className="mt-1.5 flex flex-wrap gap-1">
                            {[...x.months].sort().map((m) => <span key={m} className="rounded-md bg-bad/10 px-1.5 py-0.5 text-[11px] text-bad ring-1 ring-inset ring-bad/20">{periodLabel(m, true)}</span>)}
                          </p>
                        </div>
                        <p className="font-bold text-bad">{inr(x.amount)}</p>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  )
}
