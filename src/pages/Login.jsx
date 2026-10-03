import { useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Smartphone, BarChart3, User, Lock, Eye, EyeOff, AlertCircle, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { APP_NAME } from '../firebase'
import { Button, Ring, cx } from '../components/ui'
import { t, LangSwitch } from '../i18n'
import { ThemeSwitch } from '../theme'
import LogoMark from '../components/Logo'

const fade = (delay = 0) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay } })

/** Decorative floating glass cards showing what the app does */
function Showcase() {
  return (
    <div className="relative h-64 w-full max-w-md xl:h-72">
      <motion.div {...fade(0.5)} className="absolute left-0 top-2 w-60">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted"><TrendingUp className="size-4 text-ok" />{t('dash.collected')}</div>
          <p className="mt-2 text-2xl font-bold text-fg">₹1,24,500</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10">
            <motion.div className="h-full rounded-full bg-ok" initial={{ width: 0 }} animate={{ width: '82%' }} transition={{ duration: 1.6, delay: 0.9 }} />
          </div>
        </div>
      </motion.div>
      <motion.div {...fade(0.7)} className="absolute right-0 top-16">
        <div className="glass rounded-3xl p-4 ">
          <Ring value={82} size={100} stroke={10}><span className="text-lg font-bold text-fg">82%</span></Ring>
        </div>
      </motion.div>
      <motion.div {...fade(0.9)} className="absolute bottom-0 left-8 w-56">
        <div className="glass flex items-center gap-3 rounded-2xl p-3.5 ">
          <div className="flex size-9 items-center justify-center rounded-xl bg-ok/20 text-ok"><CheckCircle2 className="size-5" /></div>
          <div>
            <p className="text-sm font-semibold text-fg">A-101 · ₹1,500</p>
            <p className="text-xs text-ok">{t('paid')}</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function LoginField({ icon: Icon, error, children }) {
  return (
    <div>
      <div className={cx('group relative rounded-xl transition', error && 'ring-1 ring-bad/60')}>
        <Icon className={cx('pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 transition', error ? 'text-bad' : 'text-subtle group-focus-within:text-accent-ink')} />
        {children}
      </div>
      <AnimatePresence initial={false}>
        {error && (
          <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <span className="mt-1.5 flex items-center gap-1.5 pl-1 text-xs font-medium text-bad"><AlertCircle className="size-3.5" />{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Login() {
  const { signIn } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const shake = useAnimationControls()
  const userRef = useRef(null)
  const passRef = useRef(null)

  const fail = () => shake.start({ x: [0, -10, 10, -7, 7, -3, 0], transition: { duration: 0.45 } })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const errs = {}
    if (!loginId.trim()) errs.loginId = t('login.needUsername')
    if (!password) errs.password = t('login.needPassword')
    setErrors(errs)
    if (errs.loginId) { userRef.current?.focus(); return fail() }
    if (errs.password) { passRef.current?.focus(); return fail() }
    setBusy(true)
    try {
      await signIn(loginId, password)
    } catch (err) {
      setError(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(err.code)
        ? t('login.wrong')
        : err.code === 'auth/too-many-requests' ? t('login.tooMany')
          : err.code === 'auth/network-request-failed' ? t('errNetwork') : err.message)
      fail()
      setBusy(false)
    }
  }

  const inputCls = 'h-12 w-full rounded-xl border border-fg/12 bg-fg/[0.03] pl-11 pr-3 text-base sm:text-[15px] text-fg placeholder:text-subtle outline-none transition focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15'

  return (
    <div className="relative flex h-full">
      <div className="absolute inset-x-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex items-center justify-between gap-2 lg:left-auto">
        <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-fg/12 bg-surface/80 px-3.5 text-sm font-medium text-fg backdrop-blur-md transition hover:bg-surface lg:hidden">
          <ArrowLeft className="size-4" />{t('login.back')}
        </Link>
        <div className="flex gap-2"><LangSwitch /><ThemeSwitch /></div>
      </div>

      {/* Left: hero (desktop only) */}
      <div className="hidden min-h-0 flex-1 flex-col justify-between gap-6 px-12 py-10 lg:flex">
        <motion.div {...fade(0)} className="flex items-center gap-3">
          <LogoMark className="size-11" />
          <span className="text-lg font-bold text-fg">{APP_NAME}</span>
          <Link to="/" className="ml-4 inline-flex h-9 items-center gap-2 rounded-xl border border-fg/12 px-3 text-sm font-medium text-muted transition hover:bg-fg/[0.04] hover:text-fg">
            <ArrowLeft className="size-4" />{t('login.back')}
          </Link>
        </motion.div>
        <div className="mx-auto w-full max-w-xl">
          <motion.h2 {...fade(0.1)} className="text-fg text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">{t('login.hero')}</motion.h2>
          <motion.p {...fade(0.2)} className="mt-4 max-w-md text-base text-muted xl:text-lg">{t('login.heroSub')}</motion.p>
          <motion.div {...fade(0.3)} className="mt-6 flex flex-wrap gap-2">
            {[[ShieldCheck, t('login.f1')], [BarChart3, t('login.f2')], [Smartphone, t('login.f3')]].map(([I, label]) => (
              <span key={label} className="glass-soft inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-muted backdrop-blur-md"><I className="size-3.5 text-accent-ink" />{label}</span>
            ))}
          </motion.div>
          <div className="mt-8"><Showcase /></div>
        </div>
        <p className="text-xs text-subtle">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>

      {/* Right: login card (scrolls only if the phone is very short) */}
      <div className="no-scrollbar flex min-h-0 flex-1 overflow-y-auto lg:max-w-xl">
        <div className="m-auto w-full max-w-sm px-5 py-16">
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.1 }}>
            <motion.form animate={shake} onSubmit={submit} noValidate className="glass rounded-3xl p-6 sm:p-8">
              <div className="mb-7 text-center">
                <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 }}
                  className="mx-auto mb-4 w-fit">
                  <LogoMark className="size-16" title={APP_NAME} />
                </motion.div>
                <h1 className="text-2xl font-bold tracking-tight text-fg">{t('login.welcome')}</h1>
                <p className="mt-1 text-sm text-muted">{t('login.sub', { app: APP_NAME })}</p>
              </div>

              <div className="space-y-3">
                <LoginField icon={User} error={errors.loginId}>
                  <input ref={userRef} className={inputCls} placeholder={t('login.username')} autoComplete="username" autoCapitalize="none" autoCorrect="off"
                    value={loginId} onChange={(e) => { setLoginId(e.target.value); setErrors({}); setError('') }} autoFocus />
                </LoginField>
                <LoginField icon={Lock} error={errors.password}>
                  <input ref={passRef} className={`${inputCls} pr-12`} placeholder={t('login.password')} type={show ? 'text' : 'password'} autoComplete="current-password"
                    value={password} onChange={(e) => { setPassword(e.target.value); setErrors({}); setError('') }} />
                  <button type="button" aria-label={t('login.password')} onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-subtle hover:bg-fg/10 hover:text-fg cursor-pointer">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </LoginField>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p role="alert" initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="flex items-center gap-2 overflow-hidden rounded-xl border border-bad/25 bg-bad/10 px-3 py-2.5 text-sm text-bad">
                    <AlertCircle className="size-4 shrink-0" />{error}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button type="submit" size="lg" className="group mt-6 w-full" loading={busy}>
                {t('login.signIn')}{!busy && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
              </Button>
            </motion.form>
            <motion.p {...fade(0.5)} className="mt-5 text-center text-xs text-subtle">{t('login.help')}</motion.p>
            {import.meta.env.VITE_DEMO && (
              <motion.div {...fade(0.6)} className="mt-4 rounded-2xl border border-warn/25 bg-warn/10 p-3 text-center text-xs text-warn backdrop-blur-md">
                <p className="font-semibold">{t('demo.hint', { pw: 'demo123' })}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {[['admin', 'role.super_admin'], ['a101', 'role.wing_admin']].map(([u, r]) => (
                    <button key={u} type="button" onClick={() => { setLoginId(u); setPassword('demo123'); setErrors({}) }}
                      className="rounded-lg bg-fg/10 px-2 py-1 font-mono transition hover:bg-fg/20 cursor-pointer">
                      {u} <span className="font-sans text-warn">· {t(r)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
