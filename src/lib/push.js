import { useSyncExternalStore } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { isStandalone } from '../pwa'
import { PUSH_PUBLIC_KEY } from '../reminders'

/**
 * Maintenance reminders reach only phones where the app is installed and notifications are allowed.
 * The phone's push address is saved in Firestore (pushSubs); the hourly sender on GitHub reads it.
 */
const listeners = new Set()
const changed = () => listeners.forEach((l) => l())

export const pushSupported = () =>
  !import.meta.env.VITE_DEMO && import.meta.env.PROD && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** 'unsupported' | 'install' (open the installed app first) | 'default' | 'granted' | 'denied' */
export function reminderState() {
  if (!pushSupported()) return 'unsupported'
  if (!isStandalone()) return 'install'
  return Notification.permission
}
export const useReminderState = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, reminderState)

const b64ToBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}
const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** Subscribe this phone (asks permission the first time) and save the push address. */
export async function enableReminders() {
  if (reminderState() === 'unsupported' || reminderState() === 'install') return false
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  changed()
  if (permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(PUSH_PUBLIC_KEY) })
  const json = sub.toJSON()
  await setDoc(doc(db, 'pushSubs', await sha256(json.endpoint)), { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, createdAt: serverTimestamp() })
  return true
}

/** On start: keep an existing subscription saved (push addresses can change) */
export function refreshReminders() {
  if (reminderState() === 'granted') enableReminders().catch(() => {})
}

/** Show a notification on this phone right now (admin preview of a message) */
export async function previewNotification({ title, body }) {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification(title, { body, icon: `${import.meta.env.BASE_URL}icons/saffron-192.png`, tag: 'reminder-preview' })
  return true
}
