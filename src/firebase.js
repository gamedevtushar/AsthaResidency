import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Placeholder key keeps the app from crashing when settings are missing (a setup message is shown instead)
const app = initializeApp(config.apiKey ? config : { ...config, apiKey: 'not-configured', projectId: 'not-configured' })
export const auth = getAuth(app)
export const db = getFirestore(app)

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Astha Residency'
/** False when the build has no Firebase settings (e.g. the GitHub secret is missing) */
export const firebaseConfigured = !!config.apiKey

/**
 * Users log in with a simple username (e.g. "a101") or a real email.
 * Usernames are stored in Firebase Auth as "<username>@<LOGIN_DOMAIN>". No emails are ever sent to it.
 */
export const LOGIN_DOMAIN = 'astharesidency.app'
export const toLoginEmail = (id) => {
  const v = id.trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${LOGIN_DOMAIN}`
}
export const toLoginId = (email = '') => email.endsWith(`@${LOGIN_DOMAIN}`) ? email.split('@')[0] : email
export const isRealEmail = (email = '') => !email.endsWith(`@${LOGIN_DOMAIN}`)

/**
 * Create a login without signing the admin out: uses a separate, temporary Firebase app instance.
 * Returns the new user's uid.
 */
export async function createLogin(email, password) {
  const secondary = initializeApp(config, `create-${Date.now()}`)
  const secondaryAuth = getAuth(secondary)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    return cred.user.uid
  } finally {
    await signOut(secondaryAuth).catch(() => {})
  }
}
