import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Building2, Landmark, Wallet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useBalances } from '../hooks/useBalances'
import { inr } from '../lib/format'
import { AnimatedNumber, Card, EmptyState, IconTile, PageHeader, cx } from '../components/ui'
import { t } from '../i18n'

/** Money in hand: the whole building first, then wing by wing */
export default function Dashboard() {
  const { profile } = useAuth()
  const { wings, wingName, loading: wingsLoading } = useData()
  const { rows, loading } = useBalances(wingsLoading ? [] : wings)
  const busy = wingsLoading || loading

  const all = rows.reduce((a, r) => ({ maint: a.maint + r.maint, income: a.income + r.income, expense: a.expense + r.expense }), { maint: 0, income: 0, expense: 0 })
  const balance = all.maint + all.income - all.expense
  // The common card only appears once something is recorded for the whole building
  const cards = rows.filter((r) => r.id || r.income || r.expense)

  return (
    <>
      <PageHeader title={profile?.name ? t('dash.hello', { name: profile.name.split(' ')[0] }) : t('dash.welcome')} subtitle={t('dash.sub')} />

      <Card className="@container relative mb-4 shrink-0 overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <IconTile icon={Wallet} tone="indigo" className="size-11" iconClass="size-6" />
          <p className="text-sm font-semibold text-muted">{t('dash.total')}</p>
        </div>
        <p className={cx('relative mt-3 truncate text-4xl font-bold tracking-tight sm:text-5xl', balance < 0 ? 'text-bad' : 'text-fg')}>
          {busy ? <span className="shimmer inline-block h-11 w-48 rounded-lg" /> : <AnimatedNumber value={balance} />}
        </p>
        <div className="relative mt-5 grid gap-3 border-t border-fg/10 pt-4 @min-[28rem]:grid-cols-3">
          <Line label={t('dash.maint')} amount={all.maint} sign="+" tone="text-ok" busy={busy} />
          <Line label={t('a.otherIncome')} amount={all.income} sign="+" tone="text-ok" busy={busy} />
          <Line label={t('expenses')} amount={all.expense} sign="−" tone="text-bad" busy={busy} />
        </div>
      </Card>

      <h2 className="mb-3 shrink-0 font-semibold text-fg">{t('dash.byWing')}</h2>
      {!busy && !wings.length ? <Card><EmptyState icon={Building2} title={t('dash.noWings')} /></Card> : (
        <div className="grid shrink-0 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] lg:gap-4">
          {(busy ? wings.map((w) => ({ id: w.id })) : cards).map((r) => (
            <Card key={r.id || 'common'} className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <IconTile icon={r.id ? Building2 : Landmark} tone={r.id ? 'indigo' : 'amber'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{wingName(r.id)}</p>
                  {!r.id && <p className="truncate text-xs text-muted">{t('dash.commonSub')}</p>}
                </div>
                <p className={cx('shrink-0 text-xl font-bold', r.balance < 0 ? 'text-bad' : 'text-fg')}>
                  {busy ? <span className="shimmer inline-block h-6 w-24 rounded" /> : <AnimatedNumber value={r.balance} />}
                </p>
              </div>
              {!busy && (
                <div className="mt-3 space-y-1.5 border-t border-fg/10 pt-3 text-sm">
                  {r.id && <Row label={t('dash.maint')} amount={r.maint} sign="+" tone="text-ok" />}
                  <Row label={t('a.otherIncome')} amount={r.income} sign="+" tone="text-ok" />
                  <Row label={t('expenses')} amount={r.expense} sign="−" tone="text-bad" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-5 shrink-0">
        <Link to="/month" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
          {t('dash.viewMonth')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </>
  )
}

function Line({ label, amount, sign, tone, busy }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 @min-[28rem]:block">
      <p className="truncate text-xs font-semibold text-muted">{label}</p>
      <p className={cx('truncate text-lg font-bold', tone)}>{busy ? '—' : `${amount ? sign : ''}${inr(amount)}`}</p>
    </div>
  )
}

function Row({ label, amount, sign, tone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="truncate text-muted">{label}</span>
      <span className={cx('shrink-0 font-semibold', amount ? tone : 'text-subtle')}>{amount ? sign : ''}{inr(amount)}</span>
    </div>
  )
}
