import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { Download, ReceiptIndianRupee, CheckCircle2, Store, AlertTriangle, CalendarCog } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { inr, sum, currentPeriod, periodLabel, byNumber, downloadCsv } from '../lib/format'
import { t } from '../i18n'
import { Button, Card, EmptyState, IconButton, PageHeader, Progress, Ring, ScrollCard, Segmented, SkeletonTiles, Spinner, cx, reveal, toast } from '../components/ui'
import { MonthPicker, SearchBox, WingChips } from '../components/filters'
import { forms } from '../components/forms'

export default function Maintenance() {
  const { profile, isAdmin, canEdit } = useAuth()
  const { units, wings, wingName, loading: unitsLoading } = useData()
  const [period, setPeriod] = useState(currentPeriod())
  const [wing, setWing] = useState(profile?.role === 'wing_admin' ? profile.wingId : '')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data: dues, loading } = useQuery(() => query(collection(db, 'dues'), where('period', '==', period)), [period])

  const inWing = useMemo(() => dues.filter((d) => !wing || d.wingId === wing), [dues, wing])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inWing.filter((d) => (!status || d.status === status) && (!q || `${d.number} ${d.ownerName}`.toLowerCase().includes(q))).sort(byNumber)
  }, [inWing, status, search])
  const groups = useMemo(() => wings.map((w) => ({ wing: w, items: shown.filter((d) => d.wingId === w.id) })).filter((g) => g.items.length), [wings, shown])

  // Units this admin can bill that have no bill this month yet
  const billedIds = new Set(dues.map((d) => d.unitId))
  const missing = units.filter((u) => !billedIds.has(u.id) && canEdit(u.wingId))

  const paid = inWing.filter((d) => d.status === 'paid')
  const totals = { billed: sum(inWing), collected: sum(paid), pending: sum(inWing) - sum(paid) }
  const pct = totals.billed ? Math.round((totals.collected / totals.billed) * 100) : 0
  const openBills = () => forms.open('bills', { period })

  const exportCsv = () => {
    downloadCsv(`maintenance-${period}.csv`, [
      ['Unit', 'Wing', 'Type', 'Owner', 'Amount', 'Status', 'Paid on', 'Mode', 'Note'],
      ...[...inWing].sort(byNumber).map((d) => [d.number, wingName(d.wingId), d.type, d.ownerName, d.amount, d.status, d.paidOn, d.mode, d.note]),
    ])
    toast.info(t('downloaded'))
  }

  if (unitsLoading) return <Spinner />

  const counts = { '': dues.length, ...Object.fromEntries(wings.map((w) => [w.id, dues.filter((d) => d.wingId === w.id).length])) }

  return (
    <>
      <PageHeader title={t('nav.maintenance')} subtitle={t('m.subtitle')}
        actions={<>
          <MonthPicker value={period} onChange={setPeriod} />
          <IconButton icon={Download} label={t('exportCsv')} variant="secondary" onClick={exportCsv} disabled={!inWing.length} />
          {isAdmin && <>
            <Button variant="secondary" icon={CalendarCog} onClick={openBills}>{t('bills.button')}</Button>
            <Button variant="success" icon={ReceiptIndianRupee} onClick={() => forms.open('collect', { period })}>{t('collect.button')}</Button>
          </>}
        </>} />

      {/* Summary */}
      <Card className="mb-3 flex shrink-0 items-center gap-4 p-4 lg:mb-4">
        <Ring value={pct} size={60} stroke={7}><span className="text-sm font-bold text-fg">{pct}%</span></Ring>
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
          {[[t('m.collected'), totals.collected, 'text-ok', t('m.paidN', { n: paid.length })],
            [t('m.pending'), totals.pending, 'text-bad', t('m.unpaidN', { n: inWing.length - paid.length })],
            [t('m.totalBilled'), totals.billed, 'text-fg', t('m.units', { n: inWing.length })]].map(([label, v, color, sub]) => (
            <div key={label} className="min-w-0">
              <p className="truncate text-xs font-semibold text-muted">{label}</p>
              <p className={cx('truncate text-base font-bold sm:text-xl', color)}>{inr(v)}</p>
              <p className="truncate text-xs text-subtle">{sub}</p>
            </div>
          ))}
        </div>
        <div className="hidden w-40 xl:block"><Progress value={pct} /></div>
      </Card>

      {/* Some units have no bill this month */}
      <AnimatePresence>
        {isAdmin && !loading && missing.length > 0 && dues.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="shrink-0 overflow-hidden">
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-warn/25 bg-warn/10 px-4 py-3">
              <AlertTriangle className="size-5 shrink-0 text-warn" />
              <p className="flex-1 text-sm text-fg">{t('m.missingBanner', { n: missing.length, month: periodLabel(period) })}</p>
              <Button size="sm" variant="secondary" onClick={openBills}>{t('m.createNow')}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div variants={reveal} className="mb-3 flex shrink-0 flex-col gap-2 xl:flex-row xl:items-center">
        <WingChips value={wing} onChange={setWing} counts={counts} className="xl:flex-1" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Segmented className="w-full sm:w-auto" value={status} onChange={setStatus}
            options={[{ value: '', label: t('all') }, { value: 'unpaid', label: t('unpaid') }, { value: 'paid', label: t('paid') }]} />
          <SearchBox value={search} onChange={setSearch} placeholder={t('m.search')} className="min-w-0 flex-1 xl:w-60 xl:flex-none" />
        </div>
      </motion.div>

      {/* Building grid */}
      <ScrollCard bodyClass="p-3 sm:p-4">
        {loading ? <SkeletonTiles /> : shown.length === 0 ? (
          <EmptyState icon={ReceiptIndianRupee} title={inWing.length ? t('m.nothing') : t('m.noBills', { month: periodLabel(period) })}
            text={!inWing.length && (isAdmin ? t('m.noBillsAdmin') : t('m.noBillsViewer'))}
            action={!inWing.length && isAdmin && missing.length > 0 && <Button icon={CalendarCog} onClick={openBills}>{t('bills.createFor', { month: periodLabel(period) })}</Button>} />
        ) : (
          <div className="space-y-5">
            {groups.map(({ wing: w, items }) => (
              <section key={w.id}>
                {groups.length > 1 && (
                  <div className="mb-2.5 flex items-center justify-between px-0.5">
                    <h3 className="text-sm font-semibold text-fg">{w.name}</h3>
                    <span className="text-xs text-muted">{t('m.paidOf', { a: items.filter((d) => d.status === 'paid').length, b: items.length })}</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-5 xl:grid-cols-7">
                  {items.map((d, i) => <DueTile key={d.id} due={d} index={i} editable={canEdit(d.wingId)} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </ScrollCard>
    </>
  )
}

function DueTile({ due: d, index, editable }) {
  const isPaid = d.status === 'paid'
  return (
    <motion.button type="button" disabled={!editable}
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(index, 20) * 0.012 }}
      whileTap={editable ? { scale: 0.95 } : undefined}
      onClick={() => forms.open('payment', { due: d })}
      className={cx('relative flex min-h-[88px] flex-col items-start rounded-xl border p-2.5 text-left transition-colors disabled:cursor-default sm:p-3',
        isPaid ? 'border-ok/25 bg-ok/[0.07] enabled:hover:bg-ok/[0.13]' : 'border-bad/25 bg-bad/[0.06] enabled:hover:bg-bad/[0.12]',
        editable && 'cursor-pointer')}>
      <span className="flex w-full items-center justify-between gap-1">
        <span className="truncate text-sm font-bold text-fg">{d.number}</span>
        {isPaid ? <CheckCircle2 className="size-4 shrink-0 text-ok" /> : <span className="block size-2 shrink-0 rounded-full bg-bad" />}
      </span>
      <span className="mt-0.5 w-full truncate text-xs text-muted">{d.ownerName?.split(' ')[0] || '—'}</span>
      <span className="mt-auto flex w-full items-center justify-between pt-1.5">
        <span className={cx('text-[13px] font-semibold', isPaid ? 'text-ok' : 'text-fg')}>{inr(d.amount)}</span>
        {d.type === 'shop' && <Store className="size-3.5 text-warn" />}
      </span>
    </motion.button>
  )
}
