import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { byNumber } from '../lib/format'
import { t } from '../i18n'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)
const SIGNED_IN_ROLES = ['super_admin', 'wing_admin', 'viewer']

/**
 * Wings and units are small and used everywhere, so they are loaded once and shared.
 * Phone numbers live in a separate collection that only logged-in users can read.
 */
export function DataProvider({ children }) {
  const { profile, isLoggedIn } = useAuth()
  const canSeeContacts = isLoggedIn && SIGNED_IN_ROLES.includes(profile?.role)
  const [wings, setWings] = useState(null)
  const [units, setUnits] = useState(null)
  const [contacts, setContacts] = useState({})

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'wings'), (s) =>
      setWings(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))))
    const u2 = onSnapshot(collection(db, 'units'), (s) =>
      setUnits(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNumber)))
    return () => { u1(); u2() }
  }, [])

  useEffect(() => {
    if (!canSeeContacts) { setContacts({}); return }
    return onSnapshot(collection(db, 'unitContacts'),
      (s) => setContacts(Object.fromEntries(s.docs.map((d) => [d.id, d.data().phone || '']))),
      () => setContacts({}))
  }, [canSeeContacts])

  const value = useMemo(() => {
    const wingMap = Object.fromEntries((wings || []).map((w) => [w.id, w]))
    return {
      wings: wings || [],
      units: (units || []).map((u) => ({ ...u, phone: canSeeContacts ? contacts[u.id] ?? u.phone ?? '' : '' })),
      loading: wings === null || units === null,
      wingName: (id) => (id ? wingMap[id]?.name || t('unknownWing') : t('common')),
    }
  }, [wings, units, contacts, canSeeContacts])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
