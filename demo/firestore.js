// DEMO MODE ONLY — tiny in-memory stand-in for the parts of firebase/firestore the app uses.
import { DB } from './store'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const newId = () => Math.random().toString(36).slice(2, 12)
const listeners = new Set()

const matches = (row, { field, op, value }) =>
  op === '==' ? row[field] === value
    : op === 'in' ? value.includes(row[field])
      : op === '>=' ? row[field] >= value
        : op === '<=' ? row[field] <= value : true

function run(target) {
  const rows = DB[target.name] || []
  if (target.id) {
    const row = rows.find((r) => r.id === target.id)
    return { exists: () => !!row, id: target.id, data: () => row && { ...row } }
  }
  const hits = rows.filter((r) => target.wheres.every((w) => matches(r, w)))
  return { docs: hits.map((r) => ({ id: r.id, data: () => ({ ...r }) })) }
}

const notify = () => setTimeout(() => listeners.forEach((l) => l.cb(run(l.target))), 0)

export const getFirestore = () => ({})
export const collection = (_db, name) => ({ name, wheres: [] })
export const where = (field, op, value) => ({ field, op, value })
export const query = (col, ...wheres) => ({ ...col, wheres: [...col.wheres, ...wheres] })
/** doc(db, 'col', id) or doc(collectionRef) for a new random id */
export const doc = (a, name, id) => (name === undefined ? { name: a.name, id: newId() } : { name, id })
export const serverTimestamp = () => null

export function onSnapshot(target, cb, onError) {
  const l = { target, cb }
  listeners.add(l)
  setTimeout(() => {
    if (!listeners.has(l)) return
    try { cb(run(target)) } catch (e) { onError?.(e) }
  }, 350)
  return () => listeners.delete(l)
}

const upsert = (ref, data, merge) => {
  const rows = (DB[ref.name] ||= [])
  const i = rows.findIndex((r) => r.id === ref.id)
  if (i >= 0) rows[i] = merge ? { ...rows[i], ...data } : { id: ref.id, ...data }
  else rows.push({ id: ref.id, ...data })
}
const remove = (ref) => { DB[ref.name] = (DB[ref.name] || []).filter((r) => r.id !== ref.id) }

export async function setDoc(ref, data) { await delay(250); upsert(ref, data, false); notify() }
export async function updateDoc(ref, data) {
  await delay(250)
  if (!(DB[ref.name] || []).some((r) => r.id === ref.id)) throw Object.assign(new Error('Not found'), { code: 'not-found' })
  upsert(ref, data, true); notify()
}
export async function addDoc(col, data) { await delay(250); const ref = { name: col.name, id: newId() }; upsert(ref, data, false); notify(); return ref }
export async function deleteDoc(ref) { await delay(250); remove(ref); notify() }

export function writeBatch() {
  const ops = []
  return {
    set: (ref, data) => ops.push(() => upsert(ref, data, false)),
    update: (ref, data) => ops.push(() => upsert(ref, data, true)),
    commit: async () => { await delay(400); ops.forEach((op) => op()); notify() },
  }
}
