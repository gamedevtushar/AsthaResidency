import fs from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getAggregateFromServer, sum } from 'firebase/firestore'
const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()]))
const db = getFirestore(initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID }))
let bad = 0
for (const [c, f, v] of [['dues', 'status', 'paid'], ['transactions', 'type', 'income']]) {
  try { await getAggregateFromServer(query(collection(db, c), where(f, '==', v), where('period', '<', '2026-04')), { v: sum('amount') }); console.log(c, 'ok') }
  catch (e) { bad++; console.log(c, 'ERR', String(e.message).slice(0, 60)) }
}
process.exit(bad)
