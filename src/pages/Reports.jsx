import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { collection, getAggregateFromServer, query, sum as total, where } from 'firebase/firestore'
import { createPortal } from 'react-dom'
import { ImageDown } from 'lucide-react'
import { db } from '../firebase'
import { useQuery } from '../hooks/useQuery'
import { useWingPick } from '../hooks/useWingPick'
import SnapScroller from '../components/SnapScroller'
import { useAuth } from '../context/AuthContext'
import { useEntries } from '../hooks/useEntries'
import { inr, sum, periodLabel, currentPeriod } from '../lib/format'
import { yearImage } from '../lib/a4image'
import { periodOf } from '../lib/ledger'
import { Card, IconButton, SkeletonList, cx, toast } from '../components/ui'
import { t } from '../i18n'

/** Calendar year: January → December */
const thisYear = () => new Date().getFullYear()
const yearPeriods = (y) => Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`)

/** Money brought forward into a year: everything before its first month */
const before = (name, field, value, wingId, start) =>
  getAggregateFromServer(query(collection(db, name), where(field, '==', value), where('wingId', '==', wingId), where('period', '<', start)), { v: total('amount') })
    .then((s) => Number(s.data().v) || 0)

/** Balance brought forward for one wing ('' = common account) */
function useOpening(wingId, start) {
  const [state, set] = useState(null)
  useEffect(() => {
    let live = true
    set(null)
    Promise.all([wingId ? before('dues', 'status', 'paid', wingId, start) : 0, before('transactions', 'type', 'income', wingId, start), before('transactions', 'type', 'expense', wingId, start)])
      .then(([m, i, e]) => live && set({ opening: m + i - e }))
      .catch((e) => { console.error(e); if (live) set({ opening: 0 }) })
    return () => { live = false }
  }, [wingId, start])
  return state
}

/** One wing, one year on one screen: money in, money out and the balance carried forward, month by month */
export default function Reports() {
  const { isAdmin } = useAuth()
  const { wing, setWing, options: wingOptions, isCommon, label: wingLabel } = useWingPick()
  const wingId = isCommon ? '' : wing
  const [year, setYear] = useState(thisYear())
  const yearOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => thisYear() - 5 + i).map((y) => ({ value: y, label: String(y) })), [])
  const periods = useMemo(() => yearPeriods(year), [year])
  const now = currentPeriod()

  const { data: dues, loading: l1 } = useQuery(() => query(collection(db, 'dues'), where('period', 'in', periods)), [year])
  const { data: txns, loading: l2 } = useEntries(periods)
  const open = useOpening(wingId, periods[0])
  const loading = l1 || l2 || !open

  // Everything counts in the month it is FOR, whenever it was actually paid
  const rows = useMemo(() => {
    let balance = open?.opening || 0
    return periods.map((p) => {
      const mine = (x) => periodOf(x) === p && (x.wingId || '') === wingId
      const inn = sum(dues.filter((d) => d.period === p && d.status === 'paid' && d.wingId === wingId)) + sum(txns.filter((x) => mine(x) && x.type === 'income'))
      const out = sum(txns.filter((x) => mine(x) && x.type === 'expense'))
      balance += inn - out
      return { p, inn, out, balance, future: p > now && !inn && !out }
    })
  }, [dues, txns, periods, open, now, wingId])
  const totIn = sum(rows, 'inn')
  const totOut = sum(rows, 'out')

  // A4 picture of the year (white background, current language) to save or share
  const [saving, setSaving] = useState(false)
  const saveImage = async () => {
    setSaving(true)
    try { await yearImage({ wingName: wingLabel, year, opening: open.opening, rows, totIn, totOut }) } catch (e) { toast.error(e) } finally { setSaving(false) }
  }

  const cell = 'px-2 py-1.5 text-right tabular-nums whitespace-nowrap'
  const [slot, setSlot] = useState(null)
  useEffect(() => setSlot(document.getElementById('topbar-left')), [])
  return (
    <>
      {slot && createPortal(<span className="shrink-0 text-sm font-semibold whitespace-nowrap text-muted">– {wingLabel}</span>, slot)}
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

      {/* Wing and year scrollers, pinned just above the bottom menu */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 mt-auto flex shrink-0 items-center gap-1 border-t border-bar-line bg-bar px-2 py-1 sm:-mx-6 sm:px-4 lg:mx-0 lg:mb-0 lg:mt-4 lg:rounded-xl lg:border lg:px-2">
        <SnapScroller items={wingOptions} value={wing} onChange={setWing} className="w-[48%] shrink-0" />
        <span className="h-6 w-px shrink-0 bg-fg/15" />
        <SnapScroller items={yearOptions} value={year} onChange={setYear} className="min-w-0 flex-1" itemClass="min-w-[4rem]" />
        {isAdmin && <IconButton icon={ImageDown} label={t('img.save')} variant="secondary" className="size-10" onClick={saveImage} disabled={loading || saving} />}
      </div>
    </>
  )
}
