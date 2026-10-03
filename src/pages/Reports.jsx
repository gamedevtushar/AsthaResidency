import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { collection, getAggregateFromServer, query, sum as total, where } from 'firebase/firestore'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { db } from '../firebase'
import { useQuery } from '../hooks/useQuery'
import { useEntries } from '../hooks/useEntries'
import { inr, sum, periodLabel, currentPeriod, downloadCsv } from '../lib/format'
import { periodOf } from '../lib/ledger'
import { Card, IconButton, SkeletonList, cx, toast } from '../components/ui'
import { t } from '../i18n'

/** Calendar year: January → December */
const thisYear = () => new Date().getFullYear()
const yearPeriods = (y) => Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`)

/** Money brought forward into a year: everything before its first month */
const before = (name, field, value, start) =>
  getAggregateFromServer(query(collection(db, name), where(field, '==', value), where('period', '<', start)), { v: total('amount') })
    .then((s) => Number(s.data().v) || 0)

function useOpening(start) {
  const [state, set] = useState(null)
  useEffect(() => {
    let live = true
    set(null)
    Promise.all([before('dues', 'status', 'paid', start), before('transactions', 'type', 'income', start), before('transactions', 'type', 'expense', start)])
      .then(([m, i, e]) => live && set({ opening: m + i - e, hasEarlier: m + i + e > 0 }))
      .catch((e) => { console.error(e); if (live) set({ opening: 0, hasEarlier: false }) })
    return () => { live = false }
  }, [start])
  return state
}

/** One year on one screen: money in, money out and the balance carried forward, month by month */
export default function Reports() {
  const [year, setYear] = useState(thisYear())
  const periods = useMemo(() => yearPeriods(year), [year])
  const now = currentPeriod()

  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', 'in', periods)), [year])
  const { data: txns, loading: l2 } = useEntries(periods)
  const open = useOpening(periods[0])
  const loading = l1 || l2 || !open

  // Everything counts in the month it is FOR, whenever it was actually paid
  const rows = useMemo(() => {
    let balance = open?.opening || 0
    return periods.map((p) => {
      const inn = sum(dues.filter((d) => d.period === p && d.status === 'paid')) + sum(txns.filter((x) => periodOf(x) === p && x.type === 'income'))
      const out = sum(txns.filter((x) => periodOf(x) === p && x.type === 'expense'))
      balance += inn - out
      return { p, inn, out, balance, future: p > now && !inn && !out }
    })
  }, [dues, txns, periods, open, now])
  const totIn = sum(rows, 'inn')
  const totOut = sum(rows, 'out')

  const exportCsv = () => {
    downloadCsv(`report-${year}.csv`, [
      ['Month', 'In', 'Out', 'Balance'],
      ['Brought forward', '', '', open?.opening || 0],
      ...rows.map((r) => [periodLabel(r.p), r.inn, r.out, r.balance]),
      ['Total', totIn, totOut, rows[11].balance],
    ])
    toast.info(t('downloaded'))
  }

  const cell = 'px-2 py-1.5 text-right tabular-nums whitespace-nowrap'
  return (
    <>
      <Card className="mb-3 shrink-0 overflow-hidden">
        {loading ? <SkeletonList rows={8} /> : (
          <motion.table key={year} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full table-fixed text-[0.8125rem]">
            <colgroup><col className="w-[24%]" /><col /><col /><col /></colgroup>
            <thead className="bg-fg/[0.04] text-xs text-muted">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">{t('r.month')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('r.in')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('r.out')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('r.balance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/[0.05]">
              <tr className="bg-accent/[0.06]">
                <td colSpan={3} className="px-2 py-1.5 text-left text-xs font-semibold text-muted">{t('r.broughtForward')}</td>
                <td className={cx(cell, 'font-semibold', open.opening < 0 ? 'text-bad' : 'text-fg')}>{inr(open.opening)}</td>
              </tr>
              {rows.map((r) => (
                <tr key={r.p} className={cx(r.p === now && 'bg-fg/[0.03]')}>
                  <td className="px-2 py-1.5 text-left font-medium whitespace-nowrap text-fg">{periodLabel(r.p, true)}</td>
                  {r.future ? <td colSpan={3} className="px-2 py-1.5 text-center text-subtle">—</td> : <>
                    <td className={cx(cell, r.inn ? 'text-ok' : 'text-subtle')}>{inr(r.inn)}</td>
                    <td className={cx(cell, r.out ? 'text-bad' : 'text-subtle')}>{inr(r.out)}</td>
                    <td className={cx(cell, 'font-semibold', r.balance < 0 ? 'text-bad' : 'text-fg')}>{inr(r.balance)}</td>
                  </>}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-fg/15 bg-fg/[0.04] font-bold">
              <tr>
                <td className="px-2 py-2 text-left text-fg">{t('r.total')}</td>
                <td className={cx(cell, 'py-2 text-ok')}>{inr(totIn)}</td>
                <td className={cx(cell, 'py-2 text-bad')}>{inr(totOut)}</td>
                <td className={cx(cell, 'py-2', rows[11].balance < 0 ? 'text-bad' : 'text-fg')}>{inr(rows.findLast((r) => !r.future)?.balance ?? open.opening)}</td>
              </tr>
            </tfoot>
          </motion.table>
        )}
      </Card>

      {/* Year switcher, pinned just above the bottom menu */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 mt-auto flex shrink-0 items-center gap-2 border-t border-bar-line bg-bar px-4 py-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:mb-0 lg:mt-4 lg:rounded-xl lg:border lg:px-2">
        <IconButton icon={ChevronLeft} label={t('r.prevYear')} variant="secondary" className="size-10" disabled={!open?.hasEarlier} onClick={() => setYear(year - 1)} />
        <p className="min-w-0 flex-1 text-center text-base font-bold text-fg">{t('r.year', { y: year })}</p>
        <IconButton icon={ChevronRight} label={t('r.nextYear')} variant="secondary" className="size-10" disabled={year >= thisYear()} onClick={() => setYear(year + 1)} />
        <IconButton icon={Download} label={t('exportCsv')} variant="secondary" className="size-10" onClick={exportCsv} disabled={loading} />
      </div>
    </>
  )
}
