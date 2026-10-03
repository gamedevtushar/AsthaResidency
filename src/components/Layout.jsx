import { NavLink, Link, useLocation, useOutlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Wallet, Palette, Building2, BarChart3, Users, LogOut, KeyRound, Plus, Menu as MenuIcon, LogIn, Eye, Download } from 'lucide-react'
import { useAuth, roleLabel } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { t, LangSwitch } from '../i18n'
import { ThemeSwitch, TextSizeSwitch } from '../theme'
import { pageVariants, confirmDialog, cx, Button } from './ui'
import { forms, startInstall } from './forms'
import { useInstall } from '../pwa'
import LogoMark from './Logo'

const NAV = [
  { to: '/', key: 'month', icon: Wallet, end: true },
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
        <p className="truncate text-base font-bold text-fg">{t('appName')}</p>
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
  // Wings & Units is only for admins
  const nav = [...NAV, isAdmin && { to: '/units', key: 'units', icon: Building2 }, isSuper && { to: '/users', key: 'users', icon: Users }].filter(Boolean)

  const logout = async () => {
    if (await confirmDialog({ title: t('signOut'), message: t('confirm.signOut'), confirmText: t('signOut'), tone: 'primary' })) signOut()
  }

  // Phone bar: admins get a centre "+"
  const mobileTabs = isAdmin ? [NAV[0], { fab: true }, NAV[1], { more: true }] : [...NAV, { more: true }]

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
              className={({ isActive }) => cx('relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-base font-medium transition-colors', isActive ? 'text-accent-ink' : 'text-muted hover:bg-fg/[0.05] hover:text-fg')}>
              {({ isActive }) => <>
                {isActive && <motion.span layoutId="side-active" transition={spring} className="absolute inset-0 rounded-xl bg-accent/10" />}
                <Icon className="relative size-[1.125rem]" /><span className="relative">{t(`nav.${key}`)}</span>
              </>}
            </NavLink>
          ))}
          {!installed && (
            <button type="button" onClick={() => startInstall(canPrompt)}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-base font-medium text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg cursor-pointer">
              <Download className="size-[1.125rem]" />{t('pwa.install')}
            </button>
          )}
        </nav>
        <div className="m-3 space-y-3 rounded-xl border border-fg/10 bg-fg/[0.03] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <LangSwitch />
            <ThemeSwitch />
            <TextSizeSwitch />
            <button type="button" aria-label={t('palette')} title={t('palette')} onClick={() => forms.open('palette')}
              className="flex size-9 items-center justify-center rounded-xl border border-fg/10 bg-[linear-gradient(135deg,var(--logo-1),var(--logo-2))] text-white cursor-pointer">
              <Palette className="size-4" />
            </button>
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
        {/* Slim phone top bar: logo and name. Pages put extra info in the two slots (Accounts: wing picker and balance). */}
        <header className="z-30 flex shrink-0 items-center gap-2 border-b border-bar-line bg-bar px-4 pb-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))] lg:hidden">
          <LogoMark className="size-6 shrink-0" />
          <p className="min-w-0 truncate text-sm font-bold text-fg">{t('appName')}</p>
          <div id="topbar-left" className="contents" />
          <div id="topbar-right" className="ml-auto flex shrink-0 items-center" />
        </header>

        {/* The only scroll area. Desktop pages use a fixed frame and scroll inside their cards. */}
        <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-6 pt-4 sm:px-6 lg:h-full lg:min-h-0 lg:px-8 lg:pb-6 lg:pt-6">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} variants={pageVariants} initial="hidden" animate="show" exit="exit"
                className="flex flex-1 flex-col lg:min-h-0">
                {outlet}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Phone bottom bar: docked under the scroll area, so nothing shows beneath it */}
        <nav className="z-30 shrink-0 border-t border-bar-line bg-bar pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className={cx('mx-auto grid max-w-lg items-center gap-1 px-2 py-1.5', mobileTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
            {mobileTabs.map((item) => {
              if (item.fab) return (
                <div key="fab" className="flex justify-center">
                  <motion.button type="button" aria-label={t('quickAdd')} whileTap={{ scale: 0.9 }} onClick={() => forms.open('quickAdd')}
                    className="flex size-12 items-center justify-center rounded-2xl bg-accent text-white shadow-md shadow-accent/30 cursor-pointer">
                    <Plus className="size-6" />
                  </motion.button>
                </div>
              )
              if (item.more) return (
                <button key="more" type="button" onClick={() => forms.open('more')} className="flex flex-col items-center gap-1 rounded-xl py-2 text-[0.8125rem] font-medium text-muted cursor-pointer">
                  <MenuIcon className="size-[1.375rem]" /><span>{t('more')}</span>
                </button>
              )
              const { to, key, icon: Icon, end } = item
              return (
                <NavLink key={to} to={to} end={end} className="relative flex flex-col items-center gap-1 rounded-xl py-2 text-[0.8125rem] font-medium">
                  {({ isActive }) => <>
                    {isActive && <motion.span layoutId="bottom-active" transition={spring} className="absolute inset-0 rounded-xl bg-bar-pill" />}
                    <Icon className={cx('relative size-[1.375rem]', isActive ? 'text-accent-ink' : 'text-muted')} />
                    <span className={cx('relative max-w-full truncate px-0.5', isActive ? 'font-semibold text-accent-ink' : 'text-muted')}>{t(`nav.${key}Short`)}</span>
                  </>}
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
