import { Routes, Route, Navigate } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { Spinner, Toaster, ConfirmHost, OfflineBanner } from './components/ui'
import Backdrop from './components/Backdrop'
import Layout from './components/Layout'
import { FormHost } from './components/forms'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Monthly from './pages/Monthly'
import Units from './pages/Units'
import Reports from './pages/Reports'
import UsersPage from './pages/Users'
import { t } from './i18n'
import { firebaseConfigured } from './firebase'
import { EmptyState } from './components/ui'
import { Settings } from 'lucide-react'

/** Everyone can view without logging in. Admins log in from the menu (/login). */
export default function App() {
  const { isLoggedIn, loading, isSuper, isAdmin } = useAuth()

  return (
    <MotionConfig reducedMotion="user">
      <Backdrop />
      {!firebaseConfigured ? (
        <div className="flex h-full items-center justify-center p-6"><EmptyState icon={Settings} title={t('setup.title')} text={t('setup.text')} /></div>
      ) : loading ? <Spinner className="h-full" /> : (
        <DataProvider>
          <Routes>
            <Route path="login" element={isLoggedIn ? <Navigate to="/" replace /> : <Login />} />
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="month" element={<Monthly />} />
              {/* Old links */}
              <Route path="maintenance" element={<Navigate to="/month" replace />} />
              <Route path="accounts" element={<Navigate to="/month" replace />} />
              {isAdmin && <Route path="units" element={<Units />} />}
              <Route path="reports" element={<Reports />} />
              {isSuper && <Route path="users" element={<UsersPage />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <FormHost />
        </DataProvider>
      )}
      <Toaster />
      <ConfirmHost />
      <OfflineBanner />
      {import.meta.env.VITE_DEMO && (
        <div className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-20 rounded-full border border-warn/30 bg-warn/10 px-2.5 py-1 text-[0.75rem] font-semibold text-warn backdrop-blur-md lg:bottom-3 lg:right-4">
          {t('demo.badge')}
        </div>
      )}
    </MotionConfig>
  )
}
