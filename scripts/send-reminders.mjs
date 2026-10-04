// Sends the monthly maintenance reminders. Runs every hour on GitHub (.github/workflows/reminders.yml).
// It sends only when today's date and the current hour (India time) match the admin's settings,
// and never twice for the same day and hour.
//
// Needs two GitHub secrets:
//   FIREBASE_SERVICE_ACCOUNT  the service account JSON (Firebase Console → Project settings → Service accounts)
//   VAPID_PRIVATE_KEY         the private push key (in your local .env)
// FORCE=1 sends the first message right now (for a test).
import admin from 'firebase-admin'
import webpush from 'web-push'
import { DEFAULT_REMINDERS, PUSH_PUBLIC_KEY } from '../src/reminders.js'

const { FIREBASE_SERVICE_ACCOUNT, VAPID_PRIVATE_KEY, APP_URL = '', FORCE } = process.env
if (!FIREBASE_SERVICE_ACCOUNT || !VAPID_PRIVATE_KEY) {
  console.log('Reminders are not set up yet (add the FIREBASE_SERVICE_ACCOUNT and VAPID_PRIVATE_KEY secrets). Nothing sent.')
  process.exit(0)
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) })
webpush.setVapidDetails('mailto:noreply@astharesidency.app', PUSH_PUBLIC_KEY, VAPID_PRIVATE_KEY)
const db = admin.firestore()

const ref = db.doc('settings/reminders')
const settings = { ...DEFAULT_REMINDERS, ...((await ref.get()).data() || {}) }

// India time without depending on the server's time zone
const ist = new Date(Date.now() + 5.5 * 3600 * 1000)
const day = ist.getUTCDate()
const hour = `${String(ist.getUTCHours()).padStart(2, '0')}:00`
const key = `${ist.toISOString().slice(0, 10)}T${hour}`

let message
if (FORCE) message = settings.messages[0]
else {
  if (!settings.enabled) { console.log('Reminders are turned off.'); process.exit(0) }
  if (!settings.days.includes(day)) { console.log(`Day ${day} is not a reminder day.`); process.exit(0) }
  message = settings.messages.find((m) => m.time === hour)
  if (!message) { console.log(`No reminder at ${hour}.`); process.exit(0) }
  if (settings.lastSent === key) { console.log(`Already sent for ${key}.`); process.exit(0) }
}

const subs = (await db.collection('pushSubs').get()).docs
const payload = JSON.stringify({ title: message.title, body: message.body, link: APP_URL })
let sent = 0, removed = 0, failed = 0
await Promise.all(subs.map(async (d) => {
  const { endpoint, keys } = d.data()
  try {
    await webpush.sendNotification({ endpoint, keys }, payload, { TTL: 12 * 3600, urgency: 'high' })
    sent++
  } catch (e) {
    // The phone uninstalled the app or turned reminders off: forget it
    if (e.statusCode === 404 || e.statusCode === 410) { await d.ref.delete(); removed++ } else { failed++; console.log('Failed:', e.statusCode, e.body || e.message) }
  }
}))
if (!FORCE) await ref.set({ lastSent: key }, { merge: true })
console.log(`Reminder "${message.title}" → sent ${sent}, removed ${removed}, failed ${failed}.`)
