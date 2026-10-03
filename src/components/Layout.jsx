import { NavLink, Link, useLocation, useOutlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { LayoutDashboard, ReceiptIndianRupee, Wallet, Building2, BarChart3, Users, LogOut, KeyRound, Plus, Menu as MenuIcon, LogIn, Eye, Download } from 'lucide-react'
import { useAuth, roleLabel } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { APP_NAME } from '../firebase'
import { t, LangSwitch } from '../i18n'
import { ThemeSwitch } from '../theme'
import { pageVariants, confirmDialog, cx, Button } from './ui'
import { forms, startInstall } from './forms'
import { useInstall } from '../pwa'
import LogoMark from './Logo'

const NAV = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/maintenance', key: 'maintenance', icon: ReceiptIndianRupee },
  { to: '/accounts', key: 'accounts', icon: Wallet },
  { to: '/units', key: 'units', icon: Building2 },
  { to: '/reports', key: 'reports', icon: BarChart3 },
]

const spring = { type: 'spring', stiffness: 380, damping: 34 }

export function Avatar({ profile, className = 'size-9' }) {
  return (
    <div className={cx(className, 'flex shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white')}>
      {profile?.name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <LogoMark className="size-10 shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[15px] font-bold text-fg">{APP_NAME}</p>
        <p className="truncate text-xs text-muted">{t('appSub')}</p>
      </div>
    </Link>
  )
}

export default function Layout() {
  const { profile, isLoggedIn, isSuper, isAdmin, signOut } = useAuth()
  const { wingName } = useData()
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const { canPrompt, installed } = useInstall()
  const roleText = !isLoggedIn ? roleLabel('public')
    : profile.role === 'wing_admin' ? `${roleLabel('wing_admin')} · ${wingName(profile.wingId)}` : roleLabel(profile.role)
  const nav = isSuper ? [...NAV, { to: '/users', key: 'users', icon: Users }] : NAV

  const logout = async () => {
    if (await confirmDialog({ title: t('signOut'), message: t('confirm.signOut'), confirmText: t('signOut'), tone: 'primary' })) signOut()
  }

  // Phone bar: admins get a centre "+"; visitors get Reports there instead
  const mobileTabs = [NAV[0], NAV[1], isAdmin ? { fab: true } : NAV[4], NAV[2], { more: true }]

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="glass my-4 ml-4 hidden w-64 shrink-0 flex-col rounded-2xl lg:flex">
        <div className="px-5 pb-4 pt-5"><Logo /></div>
        {isAdmin && (
          <div className="px-3 pb-3">
            <Button icon={Plus} className="w-full" onClick={() => forms.open('quickAdd')}>{t('quickAdd')}</Button>
          </div>
        )}
        <nav className="no-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map(({ to, key, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cx('relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors', isActive ? 'text-accent-ink' : 'text-muted hover:bg-fg/[0.05] hover:text-fg')}>
              {({ isActive }) => <>
                {isActive && <motion.span layoutId="side-active" transition={spring} className="absolute inset-0 rounded-xl bg-accent/10" />}
                <Icon className="relative size-[18px]" /><span className="relative">{t(`nav.${key}`)}</span>
              </>}
            </NavLink>
          ))}
          {!installed && (
            <button type="button" onClick={() => startInstall(canPrompt)}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg cursor-pointer">
              <Download className="size-[18px]" />{t('pwa.install')}
            </button>
          )}
        </nav>
        <div className="m-3 space-y-3 rounded-xl border border-fg/10 bg-fg/[0.03] p-3">
          <div className="flex items-center justify-between gap-2">
            <LangSwitch />
            <ThemeSwitch />
          </div>
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar profile={profile} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{profile.name}</p>
                  <p className="truncate text-xs text-muted">{roleText}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => forms.open('password')} className="truncate">{t('pw.short')}</Button>
                <Button variant="dangerSoft" size="sm" icon={LogOut} onClick={logout} className="truncate">{t('signOut')}</Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs text-muted"><Eye className="size-4" />{t('public.viewing')}</p>
              <Button variant="secondary" icon={LogIn} className="w-full" onClick={() => navigate('/login')}>{t('public.login')}</Button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone top bar */}
        <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-fg/10 bg-surface/85 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
          <Logo />
          <button type="button" aria-label={t('more')} onClick={() => forms.open('more')} className="shrink-0 cursor-pointer">
            {isLoggedIn
              ? <Avatar profile={profile} className="size-10" />
              : <span className="flex size-10 items-center justify-center rounded-xl border border-fg/12 text-muted"><MenuIcon className="size-5" /></span>}
          </button>
        </header>

        {/* The only scroll area. Desktop pages use a fixed frame and scroll inside their cards. */}
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-32 pt-4 sm:px-6 lg:h-full lg:min-h-0 lg:px-8 lg:pb-6 lg:pt-6">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} variants={pageVariants} initial="hidden" animate="show" exit="exit"
                className="flex flex-1 flex-col lg:min-h-0">
                {outlet}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Phone bottom bar */}
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
        <div className="glass-strong grid grid-cols-5 items-end rounded-2xl p-1.5">
          {mobileTabs.map((item) => {
            if (item.fab) return (
              <div key="fab" className="flex justify-center">
                <motion.button type="button" aria-label={t('quickAdd')} whileTap={{ scale: 0.9 }} onClick={() => forms.open('quickAdd')}
                  className="-mt-7 mb-1 flex size-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg ring-4 ring-bg cursor-pointer">
                  <Plus className="size-7" />
                </motion.button>
              </div>
            )
            if (item.more) return (
              <button key="more" type="button" onClick={() => forms.open('more')} className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-muted cursor-pointer">
                <MenuIcon className="size-[22px]" /><span>{t('more')}</span>
              </button>
            )
            const { to, key, icon: Icon, end } = item
            return (
              <NavLink key={to} to={to} end={end} className="relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium">
                {({ isActive }) => <>
                  {isActive && <motion.span layoutId="bottom-active" transition={spring} className="absolute inset-0 rounded-xl bg-accent/10" />}
                  <Icon className={cx('relative size-[22px]', isActive ? 'text-accent-ink' : 'text-muted')} />
                  <span className={cx('relative max-w-full truncate px-0.5', isActive ? 'font-semibold text-accent-ink' : 'text-muted')}>{t(`nav.${key}Short`)}</span>
                </>}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
