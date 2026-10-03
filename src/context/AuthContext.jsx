import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, toLoginEmail } from '../firebase'
import { t } from '../i18n'

const AuthContext = createContext(null)

export const roleLabel = (role) => t(`role.${role}`)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  useEffect(() => {
    if (!user) { setProfile(null); return }
    const ref = doc(db, 'users', user.uid)
    return onSnapshot(ref, async (snap) => {
      if (snap.exists()) { setProfile({ id: snap.id, ...snap.data() }); return }
      // First login of the Main Admin: try to create the profile. The security rules only allow this
      // for the Main Admin email (kept out of the app code), so for anyone else it fails → no access.
      try {
        await setDoc(ref, { name: 'Main Admin', email: user.email, role: 'super_admin', wingId: '', createdAt: serverTimestamp() })
      } catch {
        setProfile({ role: 'disabled', name: user.email })
      }
    }, (err) => {
      console.error(err)
      setProfile({ role: 'disabled', name: user.email })
    })
  }, [user])

  // Not logged in = public, view-only visitor
  const role = user ? profile?.role : 'public'
  const value = {
    user,
    profile,
    isLoggedIn: !!user,
    loading: user === undefined || (user && !profile),
    signIn: (loginId, password) => signInWithEmailAndPassword(auth, toLoginEmail(loginId), password),
    signOut: () => signOut(auth),
    changePassword: async (current, next) => {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current))
      await updatePassword(user, next)
    },
    isSuper: role === 'super_admin',
    isAdmin: role === 'super_admin' || role === 'wing_admin',
    /** Can the current user add/edit data belonging to this wing ('' = common) */
    canEdit: (wingId) => role === 'super_admin' || (role === 'wing_admin' && !!profile.wingId && profile.wingId === wingId),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
