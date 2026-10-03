import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { addDoc, collection, deleteDoc, doc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import {
  ReceiptIndianRupee, ArrowUpCircle, ArrowDownCircle, Home, Store, Building2, UserPlus, Users, BarChart3, KeyRound, LogOut,
  Languages, CheckCircle2, RotateCcw, Trash2, Check, Eye, EyeOff, Wand2, Copy, Share2, Crown, UserCog, Shield, Ban, Pencil, Layers, ChevronRight, X, Plus, SunMoon, LogIn, CalendarCog,
  Download, Share, SquarePlus, Compass, EllipsisVertical, Smartphone,
} from 'lucide-react'
import { auth, db, createLogin, toLoginEmail, toLoginId, isRealEmail, APP_NAME } from '../firebase'
import { useAuth, roleLabel } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { inr, today, dateLabel, currentPeriod, shiftPeriod, periodLabel, PAYMENT_MODES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, byNumber } from '../lib/format'
import { recordPayment, markUnpaid, dueId, planUnits, createUnits, createWingWithUnits, updateWingMaintenance, saveMonthBills } from '../lib/actions'
import { MODE_ICONS, categoryIcon } from '../lib/icons'
import { t, tv, LangSwitch } from '../i18n'
import { ThemeSwitch } from '../theme'
import { useInstall, promptInstall, isIOS } from '../pwa'
import LogoMark from './Logo'
import { AmountInput, Button, Chips, DateField, Field, IconTile, Input, Modal, Segmented, Select, SkeletonTiles, Stepper, confirmDialog, cx, toast } from './ui'
import { SearchBox } from './filters'

/* ================= Global form host ================= */
let setCurrent = () => {}

/** Open any form from anywhere: forms.open('entry', { type: 'expense' }) */
export const forms = {
  open: (type, props = {}) => setCurrent({ type, props, key: Math.random() }),
  close: () => setCurrent(null),
}

export function FormHost() {
  const [cur, set] = useState(null)
  useEffect(() => { setCurrent = set; return () => { setCurrent = () => {} } }, [])
  const Comp = cur && REGISTRY[cur.type]
  return (
    <AnimatePresence mode="wait">
      {Comp && <Comp key={cur.key} {...cur.props} onClose={() => set(null)} />}
    </AnimatePresence>
  )
}

const modeOptions = () => PAYMENT_MODES.map((m) => ({ value: m, label: tv(m), icon: MODE_ICONS[m] }))

/** Big primary submit button used in every form footer */
const Submit = ({ form, loading, icon = Check, children, variant = 'primary' }) => (
  <Button type="submit" form={form} size="lg" variant={variant} icon={icon} loading={loading} className="flex-1">{children}</Button>
)

/* ================= Quick add ================= */
function QuickAddSheet({ onClose }) {
  const { isSuper, canEdit } = useAuth()
  const { wings } = useData()
  const canUnits = wings.some((w) => canEdit(w.id))
  const actions = [
    canUnits && { key: 'collect', icon: ReceiptIndianRupee, tone: 'green', label: t('qa.payment'), hint: t('qa.paymentHint'), run: () => forms.open('collect') },
    { key: 'expense', icon: ArrowUpCircle, tone: 'red', label: t('a.addExpense'), hint: t('qa.expenseHint'), run: () => forms.open('entry', { type: 'expense' }) },
    { key: 'income', icon: ArrowDownCircle, tone: 'cyan', label: t('a.addIncome'), hint: t('qa.incomeHint'), run: () => forms.open('entry', { type: 'income' }) },
    canUnits && { key: 'unit', icon: Home, tone: 'indigo', label: t('u.addUnit'), hint: t('qa.unitHint'), run: () => forms.open('unit') },
    isSuper && { key: 'wing', icon: Building2, tone: 'amber', label: t('u.addWing'), hint: t('qa.wingHint'), run: () => forms.open('wing') },
    isSuper && { key: 'user', icon: UserPlus, tone: 'gray', label: t('us.add'), hint: t('qa.userHint'), run: () => forms.open('user') },
  ].filter(Boolean)
  return (
    <Modal onClose={onClose} title={t('qa.title')} subtitle={t('qa.subtitle')}>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a, i) => (
          <motion.button key={a.key} type="button" onClick={a.run}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }} whileTap={{ scale: 0.96 }}
            className="flex flex-col items-start gap-3 rounded-2xl border border-fg/10 bg-fg/[0.04] p-4 text-left transition hover:border-fg/20 hover:bg-fg/[0.08] cursor-pointer">
            <IconTile icon={a.icon} tone={a.tone} />
            <div>
              <p className="text-sm font-semibold text-fg">{a.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted">{a.hint}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </Modal>
  )
}

/* ================= Mobile "More" menu ================= */
function MoreSheet({ onClose }) {
  const { profile, isLoggedIn, isSuper, signOut } = useAuth()
  const { wingName } = useData()
  const { canPrompt, installed } = useInstall()
  const navigate = useNavigate()
  const go = (to) => { onClose(); navigate(to) }
  const roleText = !isLoggedIn ? roleLabel('public')
    : profile.role === 'wing_admin' ? `${roleLabel('wing_admin')} · ${wingName(profile.wingId)}` : roleLabel(profile.role)
  const logout = async () => {
    if (await confirmDialog({ title: t('signOut'), message: t('confirm.signOut'), confirmText: t('signOut'), tone: 'primary' })) { onClose(); signOut() }
  }
  const Row = ({ icon: Icon, label, onClick, danger, right }) => (
    <button type="button" onClick={onClick}
      className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] transition-colors cursor-pointer', danger ? 'text-bad hover:bg-bad/10' : 'text-fg hover:bg-fg/[0.07]')}>
      <IconTile icon={Icon} tone={danger ? 'red' : 'gray'} className="size-9" iconClass="size-[18px]" />
      <span className="flex-1">{label}</span>
      {right ?? <ChevronRight className="size-4 text-subtle" />}
    </button>
  )
  return (
    <Modal onClose={onClose} title={isLoggedIn ? profile.name : t('menu')} subtitle={roleText}>
      <div className="space-y-1">
        {!installed && (
          <button type="button" onClick={() => startInstall(canPrompt)}
            className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.07] px-3 py-3 text-left transition-colors hover:bg-accent/[0.12] cursor-pointer">
            <LogoMark className="size-10 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-fg">{t('pwa.install')}</span>
              <span className="block truncate text-xs text-muted">{t('pwa.installHint')}</span>
            </span>
            <Download className="size-5 shrink-0 text-accent-ink" />
          </button>
        )}
        <Row icon={Building2} label={t('nav.units')} onClick={() => go('/units')} />
        <Row icon={BarChart3} label={t('nav.reports')} onClick={() => go('/reports')} />
        {isSuper && <Row icon={Users} label={t('nav.users')} onClick={() => go('/users')} />}
        <div className="my-2 h-px bg-fg/10" />
        <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] text-fg">
          <IconTile icon={Languages} tone="gray" className="size-9" iconClass="size-[18px]" />
          <span className="flex-1">{t('language')}</span>
          <LangSwitch />
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] text-fg">
          <IconTile icon={SunMoon} tone="gray" className="size-9" iconClass="size-[18px]" />
          <span className="flex-1">{t('theme')}</span>
          <ThemeSwitch />
        </div>
        <div className="my-2 h-px bg-fg/10" />
        {isLoggedIn ? <>
          <Row icon={KeyRound} label={t('changePassword')} onClick={() => forms.open('password')} />
          <Row icon={LogOut} label={t('signOut')} danger onClick={logout} right={null} />
        </> : (
          <Button size="lg" icon={LogIn} className="mt-1 w-full" onClick={() => go('/login')}>{t('public.login')}</Button>
        )}
      </div>
    </Modal>
  )
}

/* ================= Collect payment: pick a unit that still owes ================= */
function CollectSheet({ onClose, period = currentPeriod() }) {
  const { canEdit } = useAuth()
  const { units, wings } = useData()
  const [wing, setWing] = useState('')
  const [q, setQ] = useState('')
  const { data: dues, loading } = useQuery(() => query(collection(db, 'dues'), where('period', '==', period)), [period])
  const myWings = wings.filter((w) => canEdit(w.id))

  const pending = useMemo(() => {
    const map = Object.fromEntries(dues.map((d) => [d.unitId, d]))
    const s = q.trim().toLowerCase()
    return units
      .filter((u) => canEdit(u.wingId) && (!wing || u.wingId === wing))
      .filter((u) => !s || `${u.number} ${u.ownerName}`.toLowerCase().includes(s))
      .map((u) => ({ unit: u, due: map[u.id] }))
      .filter((x) => x.due?.status !== 'paid' && (x.due ? x.due.amount > 0 : u_amount(x.unit) > 0))
  }, [dues, units, wing, q, canEdit])

  return (
    <Modal onClose={onClose} size="lg" icon={ReceiptIndianRupee} iconTone="green"
      title={t('collect.title', { month: periodLabel(period) })} subtitle={t('collect.subtitle', { n: pending.length })}>
      <div className="sticky top-0 z-10 -mx-1 mb-3 space-y-2.5 bg-transparent px-1">
        <SearchBox value={q} onChange={setQ} placeholder={t('m.search')} />
        {myWings.length > 1 && (
          <Chips scroll value={wing} onChange={setWing} options={[{ value: '', label: t('allWings') }, ...myWings.map((w) => ({ value: w.id, label: w.name }))]} />
        )}
      </div>
      {loading ? <SkeletonTiles count={8} /> : pending.length === 0 ? (
        <div className="py-10 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="mx-auto mb-3 w-fit">
            <IconTile icon={CheckCircle2} tone="green" className="size-14 rounded-2xl" iconClass="size-7" />
          </motion.div>
          <p className="font-semibold text-fg">{t('collect.allPaid')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {pending.map(({ unit, due }, i) => (
            <motion.button key={unit.id} type="button"
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 18) * 0.02 }} whileTap={{ scale: 0.95 }}
              onClick={() => forms.open('payment', { due, unit, period, returnTo: 'collect' })}
              className="flex flex-col items-start rounded-2xl border border-fg/10 bg-fg/[0.05] p-3.5 text-left transition hover:border-ok/40 hover:bg-ok/10 cursor-pointer">
              <span className="flex w-full items-center justify-between">
                <span className="font-bold text-fg">{unit.number}</span>
                {unit.type === 'shop' ? <Store className="size-4 text-warn" /> : <Home className="size-4 text-subtle" />}
              </span>
              <span className="mt-0.5 w-full truncate text-xs text-muted">{unit.ownerName || '—'}</span>
              <span className="mt-2.5 text-sm font-semibold text-ok">{inr(due?.amount ?? unit.maintenance)}</span>
              {!due && <span className="mt-1 text-[10px] text-subtle">{t('collect.notBilled')}</span>}
            </motion.button>
          ))}
        </div>
      )}
    </Modal>
  )
}
const u_amount = (u) => Number(u.maintenance) || 0

/* ================= Record / edit a maintenance payment ================= */
function PaymentForm({ due, unit, period, returnTo, onClose }) {
  const { canEdit } = useAuth()
  const per = due?.period ?? period
  const number = due?.number ?? unit.number
  const owner = due?.ownerName ?? unit?.ownerName
  const wasPaid = due?.status === 'paid'
  const [f, setF] = useState({ amount: String(due?.amount ?? unit?.maintenance ?? ''), paidOn: due?.paidOn || today(), mode: due?.mode || 'UPI', note: due?.note || '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const editable = canEdit(due?.wingId ?? unit?.wingId)
  const next = () => (returnTo === 'collect' ? forms.open('collect', { period: per }) : onClose())

  const save = async (e) => {
    e.preventDefault()
    if (!(Number(f.amount) > 0)) return setError(t('a.enterAmount'))
    setBusy(true)
    try {
      await recordPayment({ due, unit, period: per, ...f })
      const id = due?.id ?? dueId(per, unit.id)
      toast.success(t('m.markedPaid', { unit: number }), {
        title: inr(f.amount),
        action: wasPaid ? undefined : { label: t('undo'), onClick: () => markUnpaid(id).catch(toast.error) },
      })
      next()
    } catch (err) { toast.error(err); setBusy(false) }
  }
  const unpay = async () => {
    setBusy(true)
    try { await markUnpaid(due.id); toast.success(t('m.markedUnpaid'), { title: number }); onClose() } catch (err) { toast.error(err); setBusy(false) }
  }
  const remove = async () => {
    if (!(await confirmDialog({ message: t('m.confirmDelete'), confirmText: t('delete') }))) return
    try { await deleteDoc(doc(db, 'dues', due.id)); toast.success(t('m.deleted'), { title: number }); onClose() } catch (err) { toast.error(err) }
  }

  return (
    <Modal onClose={onClose} icon={(due?.type ?? unit?.type) === 'shop' ? Store : Home} iconTone={wasPaid ? 'green' : 'indigo'}
      title={`${number} · ${periodLabel(per)}`} subtitle={owner || t('noOwner')}
      footer={editable && <>
        {due && <IconOnly icon={Trash2} label={t('m.deleteBill')} onClick={remove} />}
        {wasPaid && <Button variant="secondary" size="lg" icon={RotateCcw} onClick={unpay} disabled={busy}>{t('m.markUnpaid')}</Button>}
        <Submit form="pay-form" loading={busy} variant="success" icon={CheckCircle2}>{wasPaid ? t('m.update') : t('m.markPaid')}</Submit>
      </>}>
      {wasPaid && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-ok/10 px-3 py-2.5 text-sm text-ok ring-1 ring-inset ring-ok/25">
          <CheckCircle2 className="size-4" />{t('m.paidVia', { date: dateLabel(due.paidOn), mode: tv(due.mode) })}
        </div>
      )}
      <form id="pay-form" onSubmit={save} noValidate className="space-y-5">
        <Field label={t('amount')} error={error}>
          <AmountInput value={f.amount} onChange={(v) => { setError(''); setF({ ...f, amount: v }) }} invalid={!!error} />
        </Field>
        <Field label={t('paymentMode')}>
          <Chips variant="tile" className="grid-cols-4" value={f.mode} onChange={(mode) => setF({ ...f, mode })} options={modeOptions()} />
        </Field>
        <Field label={t('m.paidOn')}><DateField value={f.paidOn} onChange={(paidOn) => setF({ ...f, paidOn })} /></Field>
        <Field label={t('m.note')} optional><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </form>
    </Modal>
  )
}

const IconOnly = ({ icon: Icon, label, onClick }) => (
  <Button variant="dangerSoft" size="iconLg" aria-label={label} onClick={onClick}><Icon className="size-5" /></Button>
)

/* ================= Income / expense ================= */
function EntryForm({ entry, type: initType = 'expense', wingId: initWing, date: initDate, onClose }) {
  const { isSuper, canEdit } = useAuth()
  const { wings } = useData()
  const wingOptions = [
    ...(isSuper ? [{ value: '', label: t('common'), icon: Building2 }] : []),
    ...wings.filter((w) => canEdit(w.id)).map((w) => ({ value: w.id, label: w.name })),
  ]
  const [f, setF] = useState(entry
    ? { ...entry, amount: String(entry.amount) }
    : { type: initType, wingId: initWing !== undefined && wingOptions.some((o) => o.value === initWing) ? initWing : wingOptions[0]?.value ?? '', category: (initType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0], amount: '', date: initDate || today(), mode: 'Cash', description: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const cats = f.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const catOptions = (cats.includes(f.category) ? cats : [f.category, ...cats]).map((c) => ({ value: c, label: tv(c), icon: categoryIcon(c) }))

  const save = async (e) => {
    e.preventDefault()
    if (!(Number(f.amount) > 0)) return setError(t('a.enterAmount'))
    setBusy(true)
    const data = { type: f.type, wingId: f.wingId, category: f.category, amount: Number(f.amount), date: f.date, mode: f.mode, description: f.description.trim() }
    try {
      if (entry) await updateDoc(doc(db, 'transactions', entry.id), { ...data, updatedAt: serverTimestamp() })
      else await addDoc(collection(db, 'transactions'), { ...data, createdAt: serverTimestamp() })
      toast.success(`${tv(data.category)} · ${inr(data.amount)}`, { title: t('saved') })
      onClose()
    } catch (err) { toast.error(err); setBusy(false) }
  }
  const remove = async () => {
    if (!(await confirmDialog({ message: t('a.confirmDelete'), confirmText: t('delete') }))) return
    const { id, ...data } = entry
    try {
      await deleteDoc(doc(db, 'transactions', id))
      toast.success(`${tv(data.category)} · ${inr(data.amount)}`, { title: t('deleted'), action: { label: t('undo'), onClick: () => setDoc(doc(db, 'transactions', id), data).catch(toast.error) } })
      onClose()
    } catch (err) { toast.error(err) }
  }

  const isIn = f.type === 'income'
  return (
    <Modal onClose={onClose} icon={isIn ? ArrowDownCircle : ArrowUpCircle} iconTone={isIn ? 'cyan' : 'red'}
      title={t(entry ? (isIn ? 'a.editIncome' : 'a.editExpense') : (isIn ? 'a.addIncome' : 'a.addExpense'))}
      footer={<>
        {entry && <IconOnly icon={Trash2} label={t('delete')} onClick={remove} />}
        <Submit form="entry-form" loading={busy}>{t('save')}</Submit>
      </>}>
      <form id="entry-form" onSubmit={save} noValidate className="space-y-5">
        {!entry && (
          <Segmented className="w-full" value={f.type}
            onChange={(type) => setF({ ...f, type, category: (type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0] })}
            options={[{ value: 'expense', label: t('expense') }, { value: 'income', label: t('income') }]} />
        )}
        <Field label={t('amount')} error={error}>
          <AmountInput autoFocus value={f.amount} onChange={(v) => { setError(''); setF({ ...f, amount: v }) }} invalid={!!error} />
        </Field>
        <Field label={t('a.category')}>
          <Chips variant="tile" className="grid-cols-3 sm:grid-cols-4" value={f.category} onChange={(category) => setF({ ...f, category })} options={catOptions} />
        </Field>
        {wingOptions.length > 1 && (
          <Field label={t('wing')}><Chips value={f.wingId} onChange={(wingId) => setF({ ...f, wingId })} options={wingOptions} /></Field>
        )}
        <Field label={t('date')}><DateField value={f.date} onChange={(date) => setF({ ...f, date })} /></Field>
        <Field label={t('paymentMode')}>
          <Chips variant="tile" className="grid-cols-4" value={f.mode} onChange={(mode) => setF({ ...f, mode })} options={modeOptions()} />
        </Field>
        <Field label={t('a.description')} optional>
          <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={t('a.descPh')} />
        </Field>
      </form>
    </Modal>
  )
}

/* ================= Unit ================= */
function UnitForm({ unit, wingId, onClose }) {
  const { canEdit } = useAuth()
  const { wings, units } = useData()
  const myWings = wings.filter((w) => canEdit(w.id))
  const [f, setF] = useState(unit
    ? { ...unit, maintenance: String(unit.maintenance ?? '') }
    : { wingId: wingId && canEdit(wingId) ? wingId : myWings[0]?.id || '', number: '', type: 'flat', ownerName: '', phone: '', maintenance: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => { setErrors({}); setF({ ...f, [k]: v }) }

  const save = async (e) => {
    e.preventDefault()
    const number = f.number.trim()
    const errs = {}
    if (!number) errs.number = t('required')
    else if (units.some((u) => u.wingId === f.wingId && u.id !== unit?.id && u.number.toLowerCase() === number.toLowerCase())) errs.number = t('u.duplicate', { n: number })
    if (Object.keys(errs).length) return setErrors(errs)
    setBusy(true)
    const data = { wingId: f.wingId, number, type: f.type, ownerName: f.ownerName.trim(), maintenance: Number(f.maintenance) || 0 }
    const phone = f.phone.trim()
    try {
      let id = unit?.id
      if (unit) await updateDoc(doc(db, 'units', unit.id), data)
      else id = (await addDoc(collection(db, 'units'), { ...data, createdAt: serverTimestamp() })).id
      // Phone numbers are private: kept in a collection only logged-in users can read
      if (phone !== (unit?.phone || '')) await setDoc(doc(db, 'unitContacts', id), { phone, wingId: f.wingId })
      toast.success(t('u.unitSaved'), { title: number })
      onClose()
    } catch (err) { toast.error(err); setBusy(false) }
  }
  const remove = async () => {
    if (!(await confirmDialog({ message: t('u.confirmDelete', { n: unit.number }), confirmText: t('delete') }))) return
    try {
      await deleteDoc(doc(db, 'units', unit.id))
      if (unit.phone) await deleteDoc(doc(db, 'unitContacts', unit.id))
      toast.success(t('u.deleted'), { title: unit.number }); onClose()
    } catch (err) { toast.error(err) }
  }

  return (
    <Modal onClose={onClose} icon={f.type === 'shop' ? Store : Home} title={unit ? t('u.editUnit', { n: unit.number }) : t('u.addUnit')}
      footer={<>
        {unit && <IconOnly icon={Trash2} label={t('delete')} onClick={remove} />}
        <Submit form="unit-form" loading={busy}>{t('save')}</Submit>
      </>}>
      <form id="unit-form" onSubmit={save} noValidate className="space-y-5">
        {!unit && myWings.length > 1 && (
          <Field label={t('wing')}><Chips value={f.wingId} onChange={set('wingId')} options={myWings.map((w) => ({ value: w.id, label: w.name }))} /></Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('u.number')} error={errors.number}>
            <Input autoFocus={!unit} value={f.number} onChange={(e) => set('number')(e.target.value)} placeholder={t('u.numberPh')} invalid={!!errors.number} />
          </Field>
          <Field label={t('type')}>
            <Segmented className="h-12 w-full" value={f.type} onChange={set('type')} options={[{ value: 'flat', label: t('flat') }, { value: 'shop', label: t('shop') }]} />
          </Field>
        </div>
        <Field label={t('u.maint')} hint={t('u.maintUsualHint')}><AmountInput size="md" value={f.maintenance} onChange={set('maintenance')} /></Field>
        <Field label={t('u.owner')} optional><Input value={f.ownerName} onChange={(e) => set('ownerName')(e.target.value)} /></Field>
        <Field label={t('u.phone')} optional hint={t('u.phoneHint')}><Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} /></Field>
      </form>
    </Modal>
  )
}

/* ================= Wing wizard: create a wing with all its units, or add units to a wing ================= */
const guessPrefix = (name) => (name.trim().split(/\s+/)[0] || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 4).toUpperCase()

function WingWizard({ wing, onClose }) {
  const { units } = useData()
  const [name, setName] = useState(wing?.name ?? '')
  const [prefix, setPrefix] = useState(wing ? guessPrefix(wing.name) : '')
  const [prefixTouched, setPrefixTouched] = useState(!!wing)
  const [p, setP] = useState({ floors: 4, perFloor: 4, startFloor: 1, shops: 0, flatAmount: '1500', shopAmount: '2500' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setP({ ...p, [k]: v })

  // Floors don't always have the same number of flats: tap a unit in the preview to remove it, or add extra ones
  const [removed, setRemoved] = useState(() => new Set())
  const [extras, setExtras] = useState([])
  const [extra, setExtra] = useState('')

  const key = (n) => n.toLowerCase()
  const existing = new Set(units.filter((u) => u.wingId === wing?.id).map((u) => key(u.number)))
  const planned = [...planUnits({ prefix, ...p }), ...extras.map((n) => ({
    number: n, type: /shop|દુકાન/i.test(n) ? 'shop' : 'flat', maintenance: Number(/shop|દુકાન/i.test(n) ? p.shopAmount : p.flatAmount) || 0, extra: true,
  }))]
  const fresh = planned.filter((u) => !existing.has(key(u.number)) && !removed.has(key(u.number)))
  const flats = fresh.filter((u) => u.type === 'flat').length
  const shops = fresh.length - flats
  const toggle = (n) => setRemoved((s) => { const x = new Set(s); x.has(key(n)) ? x.delete(key(n)) : x.add(key(n)); return x })
  const addExtra = () => {
    const n = extra.trim()
    if (!n) return
    if (planned.some((u) => key(u.number) === key(n)) || existing.has(key(n))) return toast.warning(t('u.duplicate', { n }))
    setExtras((x) => [...x, n])
    setExtra('')
  }

  const save = async (e) => {
    e.preventDefault()
    if (!wing && !name.trim()) return setError(t('required'))
    if (wing && !fresh.length) return toast.warning(t('u.nothingToAdd'))
    setBusy(true)
    try {
      if (wing) await createUnits(wing.id, fresh)
      else await createWingWithUnits(name.trim(), fresh)
      toast.success(t('u.wingCreated', { name: wing?.name ?? name.trim(), n: fresh.length }))
      onClose()
    } catch (err) { toast.error(err); setBusy(false) }
  }

  return (
    <Modal onClose={onClose} size="lg" icon={Layers} iconTone="amber"
      title={wing ? t('u.addUnitsTitle', { name: wing.name }) : t('u.newWingTitle')} subtitle={t('u.wizardSub')}
      footer={<Submit form="wing-form" loading={busy}>{wing ? t('u.bulkBtn', { n: fresh.length }) : t('u.createWing')}</Submit>}>
      <form id="wing-form" onSubmit={save} noValidate className="space-y-5">
        {!wing && (
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label={t('u.wingName')} error={error}>
              <Input autoFocus value={name} invalid={!!error} placeholder={t('u.wingPh')}
                onChange={(e) => { setError(''); setName(e.target.value); if (!prefixTouched) setPrefix(guessPrefix(e.target.value)) }} />
            </Field>
            <Field label={t('u.prefix')}>
              <Input value={prefix} onChange={(e) => { setPrefixTouched(true); setPrefix(e.target.value.toUpperCase()) }} placeholder="A" />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label={t('u.floors')}><Stepper value={p.floors} onChange={set('floors')} min={0} max={60} /></Field>
          <Field label={t('u.perFloor')}><Stepper value={p.perFloor} onChange={set('perFloor')} min={1} max={30} /></Field>
          <Field label={t('u.startFloor')}><Stepper value={p.startFloor} onChange={set('startFloor')} min={0} max={60} /></Field>
          <Field label={t('u.shopCount')}><Stepper value={p.shops} onChange={set('shops')} min={0} max={50} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('u.flatAmount')}><AmountInput size="md" value={p.flatAmount} onChange={set('flatAmount')} /></Field>
          {p.shops > 0 && <Field label={t('u.shopAmount')}><AmountInput size="md" value={p.shopAmount} onChange={set('shopAmount')} /></Field>}
        </div>
        <div className="rounded-2xl border border-fg/10 bg-fg/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('u.preview')}</p>
            <p className="text-xs font-semibold text-accent-ink">
              {t('u.planSummary', { f: flats, s: shops, amt: inr(flats * (Number(p.flatAmount) || 0) + shops * (Number(p.shopAmount) || 0)) })}
            </p>
          </div>
          <p className="mb-3 text-xs text-subtle">{t('u.tapToRemove')}</p>
          <div className="no-scrollbar flex max-h-52 flex-wrap gap-1.5 overflow-y-auto">
            {planned.map((u) => {
              const exists = existing.has(key(u.number))
              const off = removed.has(key(u.number))
              return (
                <motion.button key={u.number} type="button" layout disabled={exists} whileTap={{ scale: 0.92 }} onClick={() => toggle(u.number)}
                  aria-pressed={!off && !exists}
                  className={cx('inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-sm font-medium transition-colors',
                    exists ? 'border-fg/10 text-subtle line-through' : off ? 'border-dashed border-fg/20 text-subtle line-through cursor-pointer'
                      : u.type === 'shop' ? 'border-warn/30 bg-warn/10 text-warn cursor-pointer' : 'border-accent/30 bg-accent/10 text-accent-ink cursor-pointer')}>
                  {u.number}
                  {!exists && (off ? <RotateCcw className="size-3.5" /> : <X className="size-3.5 opacity-60" />)}
                </motion.button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={t('u.addExtraPh')} className="h-11"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra() } }} />
            <Button variant="secondary" icon={Plus} onClick={addExtra} className="h-11 shrink-0">{t('add')}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/* ================= Wing: rename + change maintenance for all units ================= */
const mostCommon = (arr) => {
  const c = {}
  arr.forEach((v) => { c[v] = (c[v] || 0) + 1 })
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

function WingEditForm({ wing, onClose }) {
  const { isSuper } = useAuth()
  const { units } = useData()
  const wu = units.filter((u) => u.wingId === wing.id)
  const hasShops = wu.some((u) => u.type === 'shop')
  const [name, setName] = useState(wing.name)
  const [flatAmount, setFlat] = useState(String(mostCommon(wu.filter((u) => u.type === 'flat').map((u) => u.maintenance))))
  const [shopAmount, setShop] = useState(String(mostCommon(wu.filter((u) => u.type === 'shop').map((u) => u.maintenance))))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError(t('required'))
    setBusy(true)
    try {
      if (isSuper && name.trim() !== wing.name) await updateDoc(doc(db, 'wings', wing.id), { name: name.trim() })
      await updateWingMaintenance(wu, { flatAmount, shopAmount })
      toast.success(t('u.wingUpdated', { name: name.trim() }))
      onClose()
    } catch (err) { toast.error(err); setBusy(false) }
  }
  const remove = async () => {
    if (wu.length) return toast.warning(t('u.removeUnitsFirst'), { title: wing.name })
    if (!(await confirmDialog({ message: t('u.confirmDeleteWing', { n: wing.name }), confirmText: t('delete') }))) return
    try { await deleteDoc(doc(db, 'wings', wing.id)); toast.success(t('u.wingDeleted'), { title: wing.name }); onClose() } catch (err) { toast.error(err) }
  }

  return (
    <Modal onClose={onClose} icon={Building2} iconTone="amber" title={t('u.editWingMaint')} subtitle={wing.name}
      footer={<>
        {isSuper && <IconOnly icon={Trash2} label={t('u.deleteWing')} onClick={remove} />}
        <Submit form="wing-edit" loading={busy}>{t('save')}</Submit>
      </>}>
      <form id="wing-edit" onSubmit={save} noValidate className="space-y-5">
        {isSuper && (
          <Field label={t('u.wingName')} error={error}>
            <Input value={name} invalid={!!error} onChange={(e) => { setError(''); setName(e.target.value) }} />
          </Field>
        )}
        <Field label={t('u.maintFlats')}><AmountInput size="md" value={flatAmount} onChange={setFlat} /></Field>
        {hasShops && <Field label={t('u.maintShops')}><AmountInput size="md" value={shopAmount} onChange={setShop} /></Field>}
        <p className="rounded-xl bg-info/10 px-3 py-2.5 text-xs leading-relaxed text-info ring-1 ring-inset ring-info/20">{t('u.maintHint')}</p>
      </form>
    </Modal>
  )
}

/* ================= User ================= */
const ROLE_CARDS = [
  { value: 'viewer', icon: Shield, tone: 'green', hint: 'us.roleViewerHint' },
  { value: 'wing_admin', icon: UserCog, tone: 'amber', hint: 'us.roleWingHint' },
  { value: 'super_admin', icon: Crown, tone: 'indigo', hint: 'us.roleSuperHint' },
  { value: 'disabled', icon: Ban, tone: 'red', hint: 'us.roleDisabledHint' },
]
const strength = (pw) => [pw.length >= 6, pw.length >= 10, /\d/.test(pw) && /[a-z]/i.test(pw), /[^a-z0-9]/i.test(pw)].filter(Boolean).length
const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint32Array(8)), (n) => chars[n % chars.length]).join('')
}

function UserForm({ user, onClose }) {
  const { user: me } = useAuth()
  const { wings, units, wingName } = useData()
  const isNew = !user
  const [f, setF] = useState(user ? { ...user } : { name: '', loginId: '', password: randomPassword(), role: 'wing_admin', wingId: wings[0]?.id || '', unitId: '' })
  const [show, setShow] = useState(true)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const set = (k) => (v) => { setErrors({}); setF((x) => ({ ...x, [k]: v })) }
  const s = strength(f.password || '')

  const linkUnit = (id) => {
    const u = units.find((x) => x.id === id)
    setErrors({})
    setF((x) => ({ ...x, unitId: id, name: x.name || u?.ownerName || '', loginId: x.loginId || (u ? u.number.toLowerCase().replace(/[^a-z0-9]/g, '') : '') }))
  }

  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    const loginId = (f.loginId || '').trim().toLowerCase()
    if (!f.name.trim()) errs.name = t('us.nameReq')
    if (isNew && !loginId) errs.loginId = t('required')
    else if (isNew && !/^[a-z0-9._@-]+$/.test(loginId)) errs.loginId = t('us.badUsername')
    if (isNew && f.password.length < 6) errs.password = t('us.pwMin')
    if (f.role === 'wing_admin' && !f.wingId) errs.wing = t('us.wingReq')
    if (Object.keys(errs).length) return setErrors(errs)

    const data = { name: f.name.trim(), role: f.role, wingId: f.role === 'wing_admin' ? f.wingId : '' }
    setBusy(true)
    try {
      if (isNew) {
        const email = toLoginEmail(loginId)
        const uid = await createLogin(email, f.password)
        await setDoc(doc(db, 'users', uid), { ...data, email, createdAt: serverTimestamp() })
        toast.success(t('us.added', { n: data.name }))
        setCreated({ name: data.name, loginId, password: f.password })
      } else {
        await updateDoc(doc(db, 'users', user.id), data)
        toast.success(t('us.updated'), { title: data.name })
        onClose()
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setErrors({ loginId: t('us.exists') })
      else toast.error(err)
      setBusy(false)
    }
  }
  const remove = async () => {
    if (!(await confirmDialog({ title: t('us.remove'), message: t('us.confirmRemove', { n: user.name }), confirmText: t('us.remove') }))) return
    try { await deleteDoc(doc(db, 'users', user.id)); toast.success(t('us.removed'), { title: user.name }); onClose() } catch (err) { toast.error(err) }
  }
  const sendReset = async () => {
    try { await sendPasswordResetEmail(auth, user.email); toast.success(t('us.resetSent', { e: user.email })) } catch (err) { toast.error(err) }
  }

  if (created) return <UserCreated {...created} onClose={onClose} />

  const self = user?.id === me.uid
  const unitOptions = [...units].sort(byNumber).map((u) => ({ value: u.id, label: u.number, hint: `${wingName(u.wingId)}${u.ownerName ? ` · ${u.ownerName}` : ''}`, icon: u.type === 'shop' ? Store : Home }))

  return (
    <Modal onClose={onClose} size="lg" icon={isNew ? UserPlus : Pencil} title={isNew ? t('us.add') : t('us.edit', { n: user.name })}
      subtitle={!isNew ? `@${toLoginId(user.email)}` : undefined}
      footer={<>
        {!isNew && !self && <IconOnly icon={Trash2} label={t('us.remove')} onClick={remove} />}
        {!isNew && isRealEmail(user.email) && <Button variant="secondary" size="lg" icon={KeyRound} onClick={sendReset}>{t('us.resetShort')}</Button>}
        <Submit form="user-form" loading={busy}>{isNew ? t('us.create') : t('save')}</Submit>
      </>}>
      <form id="user-form" onSubmit={save} noValidate className="space-y-5">
        {isNew && units.length > 0 && (
          <Field label={t('us.linkUnit')} hint={t('us.linkHint')}>
            <Select searchable value={f.unitId} onChange={linkUnit} options={unitOptions} placeholder={t('u.pickUnit')} icon={Home} />
          </Field>
        )}
        <Field label={t('us.fullName')} error={errors.name}>
          <Input value={f.name} invalid={!!errors.name} onChange={(e) => set('name')(e.target.value)} placeholder={t('us.namePh')} />
        </Field>
        {isNew && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('login.username')} hint={!errors.loginId && t('us.usernameShortHint')} error={errors.loginId}>
              <Input value={f.loginId} invalid={!!errors.loginId} onChange={(e) => set('loginId')(e.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="a101" />
            </Field>
            <Field label={t('login.password')} error={errors.password}>
              <div className="relative">
                <Input type={show ? 'text' : 'password'} value={f.password} invalid={!!errors.password} onChange={(e) => set('password')(e.target.value)} className="pr-20 font-mono" autoComplete="new-password" />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2">
                  <button type="button" aria-label={t('us.generate')} onClick={() => set('password')(randomPassword())} className="rounded-lg p-2 text-subtle hover:bg-fg/10 hover:text-accent-ink cursor-pointer"><Wand2 className="size-4" /></button>
                  <button type="button" aria-label={t('login.password')} onClick={() => setShow(!show)} className="rounded-lg p-2 text-subtle hover:bg-fg/10 hover:text-fg cursor-pointer">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div key={i} className="h-1 rounded-full" animate={{ backgroundColor: i < s ? ['#f43f5e', '#f59e0b', '#a78bfa', '#34d399'][s - 1] : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </Field>
          </div>
        )}
        {!self && (
          <Field label={t('us.role')}>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_CARDS.filter((r) => r.value !== 'viewer' || user?.role === 'viewer').map((r) => {
                const active = f.role === r.value
                return (
                  <motion.button key={r.value} type="button" whileTap={{ scale: 0.97 }} onClick={() => set('role')(r.value)} aria-pressed={active}
                    className={cx('flex items-center gap-3 rounded-2xl border p-3 text-left transition cursor-pointer',
                      active ? 'border-accent/60 bg-accent/10 shadow-lg' : 'border-fg/10 bg-fg/[0.04] hover:bg-fg/[0.08]')}>
                    <IconTile icon={r.icon} tone={r.tone} className="size-9" iconClass="size-[18px]" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">{roleLabel(r.value)}</span>
                      <span className="block truncate text-xs text-muted">{t(r.hint)}</span>
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </Field>
        )}
        <AnimatePresence initial={false}>
          {f.role === 'wing_admin' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Field label={t('us.wingManage')} error={errors.wing}>
                {wings.length
                  ? <Chips value={f.wingId} onChange={set('wingId')} options={wings.map((w) => ({ value: w.id, label: w.name }))} />
                  : <p className="text-sm text-bad">{t('us.addWingFirst')}</p>}
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Modal>
  )
}

function UserCreated({ name, loginId, password, onClose }) {
  const text = `${APP_NAME}\n${location.origin}${import.meta.env.BASE_URL}\n${t('login.username')}: ${loginId}\n${t('login.password')}: ${password}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success(t('us.copied')) } catch { toast.error(t('errGeneric')) }
  }
  const share = async () => {
    try { await navigator.share({ title: APP_NAME, text }) } catch (err) { if (err?.name !== 'AbortError') copy() }
  }
  return (
    <Modal onClose={onClose} title={t('us.createdTitle')}
      footer={<>
        {navigator.share && <Button variant="secondary" size="lg" icon={Share2} onClick={share}>{t('share')}</Button>}
        <Button size="lg" icon={Copy} onClick={copy} className="flex-1">{t('us.copy')}</Button>
      </>}>
      <div className="flex flex-col items-center py-2 text-center">
        <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}
          className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-xl">
          <CheckCircle2 className="size-8 text-fg" />
        </motion.div>
        <p className="font-semibold text-fg">{name}</p>
        <p className="mt-1 text-sm text-muted">{t('us.shareHint')}</p>
        <div className="glass-soft mt-5 w-full space-y-2 rounded-2xl p-4 text-left font-mono text-sm">
          <p><span className="text-subtle">{t('login.username')}:</span> <span className="text-fg">{loginId}</span></p>
          <p><span className="text-subtle">{t('login.password')}:</span> <span className="text-fg">{password}</span></p>
        </div>
      </div>
    </Modal>
  )
}

/* ================= Change own password ================= */
function ChangePasswordForm({ onClose }) {
  const { changePassword } = useAuth()
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setErrors({}); setF({ ...f, [k]: e.target.value }) }

  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!f.current) errs.current = t('required')
    if (f.next.length < 6) errs.next = t('pw.min')
    else if (f.next !== f.confirm) errs.confirm = t('pw.mismatch')
    if (Object.keys(errs).length) return setErrors(errs)
    setBusy(true)
    try {
      await changePassword(f.current, f.next)
      toast.success(t('pw.done'))
      onClose()
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setErrors({ current: t('pw.wrong') })
      else toast.error(err)
      setBusy(false)
    }
  }
  const type = show ? 'text' : 'password'
  return (
    <Modal onClose={onClose} icon={KeyRound} title={t('changePassword')}
      footer={<Submit form="pw-form" loading={busy}>{t('pw.change')}</Submit>}>
      <form id="pw-form" onSubmit={save} noValidate className="space-y-5">
        <Field label={t('pw.current')} error={errors.current}>
          <div className="relative">
            <Input type={type} autoComplete="current-password" autoFocus value={f.current} onChange={set('current')} invalid={!!errors.current} className="pr-11" />
            <button type="button" aria-label={t('login.password')} onClick={() => setShow(!show)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-subtle hover:bg-fg/10 hover:text-fg cursor-pointer">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label={t('pw.new')} error={errors.next}><Input type={type} autoComplete="new-password" value={f.next} onChange={set('next')} invalid={!!errors.next} /></Field>
        <Field label={t('pw.confirm')} error={errors.confirm}><Input type={type} autoComplete="new-password" value={f.confirm} onChange={set('confirm')} invalid={!!errors.confirm} /></Field>
      </form>
    </Modal>
  )
}

/* ================= Monthly bills: amount can be different every month ================= */
function BillsForm({ period = currentPeriod(), onClose }) {
  const { canEdit } = useAuth()
  const { units, wings } = useData()
  const prev = shiftPeriod(period, -1)
  const { data: dues, loading } = useQuery(() => query(collection(db, 'dues'), where('period', 'in', [period, prev])), [period])
  const [amounts, setAmounts] = useState({}) // group key → amount typed by the admin
  const [allVals, setAllVals] = useState({}) // 'flat' | 'shop' → amount for every wing
  const [busy, setBusy] = useState(false)

  // One row per wing × (flats | shops). Suggested amount: this month's bill → last month's bill → usual amount.
  const groups = useMemo(() => {
    const cur = {}
    const last = {}
    dues.forEach((d) => { (d.period === period ? cur : last)[d.unitId] = d })
    return wings.filter((w) => canEdit(w.id)).flatMap((w) => ['flat', 'shop'].map((type) => {
      const items = units.filter((u) => u.wingId === w.id && u.type === type)
        .map((u) => ({ unit: u, due: cur[u.id], suggested: Number(cur[u.id]?.amount ?? last[u.id]?.amount ?? u.maintenance) || 0 }))
      if (!items.length) return null
      return { key: `${w.id}-${type}`, wing: w, type, items, common: mostCommon(items.map((i) => i.suggested)) }
    })).filter(Boolean)
  }, [dues, wings, units, period, canEdit])

  const touched = (g) => amounts[g.key] !== undefined
  const plan = groups.flatMap((g) => g.items.map((i) => ({ ...i, amount: touched(g) ? Number(amounts[g.key]) || 0 : i.suggested })))
  const total = plan.reduce((s, x) => s + (x.due?.status === 'paid' ? Number(x.due.amount) : x.amount), 0)
  const count = plan.filter((x) => x.due || x.amount > 0).length
  const types = [...new Set(groups.map((g) => g.type))]
  const setAll = (type, v) => {
    setAllVals((x) => ({ ...x, [type]: v }))
    setAmounts((a) => ({ ...a, ...Object.fromEntries(groups.filter((g) => g.type === type).map((g) => [g.key, v])) }))
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await saveMonthBills(period, plan)
      toast.success(t('bills.saved', { c: r.created, u: r.updated }), { title: periodLabel(period) })
      onClose()
    } catch (err) { toast.error(err); setBusy(false) }
  }

  return (
    <Modal onClose={onClose} size="lg" icon={CalendarCog} title={t('bills.title', { month: periodLabel(period) })} subtitle={t('bills.sub')}
      footer={<>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{t('bills.count', { n: count })}</p>
          <p className="truncate text-lg font-bold text-fg">{inr(total)}</p>
        </div>
        <Button type="submit" form="bills-form" size="lg" icon={Check} loading={busy} disabled={loading}>{t('bills.save')}</Button>
      </>}>
      {loading ? <SkeletonTiles count={6} /> : (
        <form id="bills-form" onSubmit={save} noValidate className="space-y-5">
          <p className="rounded-xl bg-info/10 px-3.5 py-3 text-sm leading-relaxed text-info">{t('bills.hint')}</p>

          {groups.length > 1 && (
            <div className={cx('grid gap-3', types.length > 1 && 'sm:grid-cols-2')}>
              {types.map((type) => (
                <Field key={type} label={t(type === 'flat' ? 'bills.allFlats' : 'bills.allShops')}>
                  <AmountInput size="md" placeholder="—" value={allVals[type] ?? ''}
                    onChange={(v) => setAll(type, v)} />
                </Field>
              ))}
            </div>
          )}

          <div className="divide-y divide-fg/[0.08] rounded-xl border border-fg/10">
            {groups.map((g) => {
              const mixed = !touched(g) && new Set(g.items.map((i) => i.suggested)).size > 1
              const paid = g.items.filter((i) => i.due?.status === 'paid').length
              return (
                <div key={g.key} className="flex items-center gap-3 p-3">
                  <IconTile icon={g.type === 'shop' ? Store : Home} tone={g.type === 'shop' ? 'amber' : 'indigo'} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{g.wing.name} · {t(g.type === 'shop' ? 'shops' : 'flats')}</p>
                    <p className="truncate text-xs text-muted">
                      {t('m.units', { n: g.items.length })}{paid > 0 && ` · ${t('bills.paidKept', { n: paid })}`}{mixed && ` · ${t('bills.mixed')}`}
                    </p>
                  </div>
                  <div className="w-32 shrink-0 sm:w-40">
                    <AmountInput size="md" value={touched(g) ? amounts[g.key] : mixed ? '' : String(g.common)} placeholder={mixed ? t('bills.each') : '0'}
                      onChange={(v) => setAmounts((a) => ({ ...a, [g.key]: v }))} />
                  </div>
                </div>
              )
            })}
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ================= Install as an app ================= */

/** Shows the browser's own install dialog when it allows it; otherwise step-by-step instructions. */
export async function startInstall(canPrompt) {
  if (!canPrompt) return forms.open('install')
  forms.close()
  if (await promptInstall()) toast.success(t('pwa.installed'))
}

function InstallSheet({ onClose }) {
  const ios = isIOS()
  const steps = ios
    ? [[Compass, t('pwa.ios1')], [Share, t('pwa.ios2')], [SquarePlus, t('pwa.ios3')], [CheckCircle2, t('pwa.ios4')]]
    : [[EllipsisVertical, t('pwa.and1')], [Download, t('pwa.and2')], [CheckCircle2, t('pwa.and3')]]
  return (
    <Modal onClose={onClose} icon={Smartphone} title={t('pwa.howTitle')} subtitle={t('pwa.installHint')}>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-fg/10 bg-fg/[0.03] p-3">
        <LogoMark className="size-12 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{APP_NAME}</p>
          <p className="text-xs text-muted">{t('pwa.appNote')}</p>
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map(([Icon, text], i) => (
          <motion.li key={text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
            className="flex items-center gap-3 rounded-xl border border-fg/10 p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{i + 1}</span>
            <IconTile icon={Icon} tone="gray" className="size-9" iconClass="size-[18px]" />
            <span className="text-[15px] text-fg">{text}</span>
          </motion.li>
        ))}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-subtle">{t('pwa.iconNote')}</p>
    </Modal>
  )
}

const REGISTRY = {
  bills: BillsForm,
  install: InstallSheet,
  quickAdd: QuickAddSheet, more: MoreSheet, collect: CollectSheet, payment: PaymentForm, entry: EntryForm,
  unit: UnitForm, wing: WingWizard, wingEdit: WingEditForm, user: UserForm, password: ChangePasswordForm,
}

