// DEMO MODE ONLY — in-memory stand-in for the parts of firebase/auth the app uses.
import { ACCOUNTS } from './store'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const fail = (code) => Object.assign(new Error(code), { code })
const listeners = new Set()

// Keep the session across reloads within the same tab
let current = (() => {
  try { return JSON.parse(sessionStorage.getItem('demo-user')) } catch { return null }
})()
const setCurrent = (u) => {
  current = u
  try { u ? sessionStorage.setItem('demo-user', JSON.stringify(u)) : sessionStorage.removeItem('demo-user') } catch { /* ignore */ }
  listeners.forEach((cb) => cb(current))
}

/** Each Firebase app instance gets its own auth object; only the default one is "the" session. */
export const getAuth = (app = {}) => (app.__auth ||= { primary: app.name === '[DEFAULT]' })

export function onAuthStateChanged(_auth, cb) {
  listeners.add(cb)
  setTimeout(() => cb(current), 100)
  return () => listeners.delete(cb)
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  await delay(500)
  const acc = ACCOUNTS[email]
  if (!acc || acc.password !== password) throw fail('auth/invalid-credential')
  setCurrent({ uid: acc.uid, email })
  return { user: current }
}

export async function createUserWithEmailAndPassword(_auth, email, password) {
  await delay(400)
  if (ACCOUNTS[email]) throw fail('auth/email-already-in-use')
  const uid = 'u' + Math.random().toString(36).slice(2, 10)
  ACCOUNTS[email] = { uid, password }
  return { user: { uid, email } }
}

export async function signOut(auth) { if (auth?.primary) setCurrent(null) }
export async function sendPasswordResetEmail() { await delay(300) }

export const EmailAuthProvider = { credential: (email, password) => ({ email, password }) }
export async function reauthenticateWithCredential(_user, cred) {
  await delay(300)
  if (ACCOUNTS[cred.email]?.password !== cred.password) throw fail('auth/invalid-credential')
}
export async function updatePassword(user, password) { ACCOUNTS[user.email].password = password }
