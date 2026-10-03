import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { collection, query, where } from 'firebase/firestore'
import { Plus, Download, Wallet } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { inr, sum, currentPeriod, periodRange, today, dateLabel, downloadCsv } from '../lib/format'
import { categoryIcon } from '../lib/icons'
import { t, tv } from '../i18n'
import { Badge, Button, Card, EmptyState, IconButton, IconTile, PageHeader, ScrollCard, Segmented, SkeletonList, cx, reveal, toast } from '../components/ui'
import { MonthPicker, WingChips, matchWing, SearchBox } from '../components/filters'
import { forms } from '../components/forms'

export default function Accounts() {
  const { isAdmin, canEdit } = useAuth()
  const { wingName } = useData()
  const [period, setPeriod] = useState(currentPeriod())
  const [wing, setWing] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')

  const [from, to] = periodRange(period)
  const { data: txns, loading } = useQuery(
    () => query(collection(db, 'transactions'), where('date', '>=', from), where('date', '<=', to)), [period])

  const inWing = useMemo(() => txns.filter((x) => matchWing(wing, x.wingId)), [txns, wing])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inWing
      .filter((x) => (!type || x.type === type) && (!q || `${x.category} ${tv(x.category)} ${x.description}`.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [inWing, type, search])
  const days = useMemo(() => {
    const m = new Map()
    shown.forEach((x) => m.set(x.date, [...(m.get(x.date) || []), x]))
    return [...m.entries()]
  }, [shown])

  const income = sum(inWing.filter((x) => x.type === 'income'))
  const expense = sum(inWing.filter((x) => x.type === 'expense'))
  const defaultDate = period === currentPeriod() ? today() : from
  const add = (kind) => forms.open('entry', { type: kind, date: defaultDate, wingId: wing === 'common' ? '' : wing || undefined })

  const exportCsv = () => {
    downloadCsv(`accounts-${period}.csv`, [
      ['Date', 'Type', 'Wing', 'Category', 'Description', 'Mode', 'Amount'],
      ...shown.map((x) => [x.date, x.type, wingName(x.wingId), x.category, x.description, x.mode, x.amount]),
    ])
    toast.info(t('downloaded'))
  }

  return (
    <>
      <PageHeader title={t('nav.accounts')} subtitle={t('a.subtitle')}
        actions={<>
          <MonthPicker value={period} onChange={setPeriod} />
          <IconButton icon={Download} label={t('exportCsv')} variant="secondary" onClick={exportCsv} disabled={!shown.length} />
          {isAdmin && <>
            <Button variant="secondary" icon={Plus} onClick={() => add('income')}>{t('income')}</Button>
            <Button icon={Plus} onClick={() => add('expense')}>{t('expense')}</Button>
          </>}
        </>} />

      {/* Three columns when there is room, otherwise one row per figure */}
      <Card className="@container mb-3 shrink-0 p-4 lg:mb-4">
        <div className="grid gap-2 @min-[18rem]:grid-cols-3">
          {[[t('a.otherIncome'), income, 'text-ok'], [t('expenses'), expense, 'text-bad'], [t('a.net'), income - expense, income - expense >= 0 ? 'text-fg' : 'text-warn']].map(([label, v, color]) => (
            <div key={label} className="flex min-w-0 items-center justify-between gap-3 @min-[18rem]:block">
              <p className="truncate text-[0.8125rem] font-semibold uppercase tracking-wider text-muted">{label}</p>
              <p className={cx('truncate text-lg font-bold sm:text-xl', color)}>{inr(v)}</p>
            </div>
          ))}
        </div>
      </Card>

      <motion.div variants={reveal} className="mb-3 flex shrink-0 flex-col gap-2 xl:flex-row xl:items-center">
        <WingChips includeCommon value={wing} onChange={setWing} className="xl:flex-1" />
        <div className="flex flex-wrap gap-2">
          <Segmented value={type} onChange={setType}
            options={[{ value: '', label: t('all') }, { value: 'expense', label: t('expenses') }, { value: 'income', label: t('income') }]} />
          <SearchBox value={search} onChange={setSearch} placeholder={t('a.search')} className="min-w-[8rem] flex-1 xl:w-60 xl:flex-none" />
        </div>
      </motion.div>

      <ScrollCard>
        {loading ? <SkeletonList /> : days.length === 0 ? (
          <EmptyState icon={Wallet} title={t('a.empty')} text={isAdmin ? t('a.emptyAdmin') : t('a.emptyViewer')}
            action={isAdmin && <Button icon={Plus} onClick={() => add('expense')}>{t('a.addExpense')}</Button>} />
        ) : days.map(([date, items], gi) => (
          <section key={date}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-fg/[0.06] bg-surface/90 px-4 py-2 backdrop-blur-md">
              <span className="text-xs font-semibold text-muted">{dateLabel(date)}</span>
              <span className="text-xs text-subtle">{inr(sum(items.filter((x) => x.type === 'expense')))}</span>
            </div>
            {items.map((x, i) => {
              const isIn = x.type === 'income'
              const editable = canEdit(x.wingId)
              return (
                <motion.div key={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(gi * 2 + i, 16) * 0.025 }}
                  onClick={editable ? () => forms.open('entry', { entry: x }) : undefined}
                  className={cx('flex items-center gap-3 px-4 py-3 transition-colors', editable && 'cursor-pointer hover:bg-fg/[0.06]')}>
                  <IconTile icon={categoryIcon(x.category)} tone={isIn ? 'green' : 'red'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{tv(x.category)}</p>
                    <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted">
                      <Badge color={x.wingId ? 'blue' : 'gray'}>{wingName(x.wingId)}</Badge>
                      <span className="truncate">{tv(x.mode)}{x.description && ` · ${x.description}`}</span>
                    </p>
                  </div>
                  <p className={cx('shrink-0 text-sm font-bold', isIn ? 'text-ok' : 'text-fg')}>{isIn ? '+' : '−'}{inr(x.amount)}</p>
                </motion.div>
              )
            })}
          </section>
        ))}
      </ScrollCard>
    </>
  )
}
