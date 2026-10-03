import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

/* Balances are read as one-off totals, so screens are told whenever money records change */
const changeListeners = new Set()
export const onMoneyChange = (fn) => { changeListeners.add(fn); return () => changeListeners.delete(fn) }
const changed = (result) => { changeListeners.forEach((fn) => fn()); return result }

export const UNPAID = { status: 'unpaid', paidOn: '', mode: '' }
export const dueId = (period, unitId) => `${period}_${unitId}`

/** A fresh unpaid maintenance bill for a unit */
export const newDue = (u, period) => ({
  period, unitId: u.id, wingId: u.wingId, number: u.number, type: u.type, ownerName: u.ownerName || '',
  amount: Number(u.maintenance) || 0, ...UNPAID, note: '', createdAt: serverTimestamp(),
})

/** Run writes in Firestore batches (max 500 per batch) */
async function inBatches(items, apply, size = 400) {
  for (let i = 0; i < items.length; i += size) {
    const batch = writeBatch(db)
    items.slice(i, i + size).forEach((item) => apply(batch, item))
    await batch.commit()
  }
}

/**
 * Maintenance can differ every month. items: [{ unit, due, amount }]
 * Creates missing bills and updates the amount of UNPAID bills. Paid bills are never changed.
 */
export async function saveMonthBills(period, items) {
  const creates = items.filter((x) => !x.due && x.amount > 0)
  const updates = items.filter((x) => x.due && x.due.status !== 'paid' && Number(x.due.amount) !== x.amount)
  await inBatches([...creates.map((x) => ['c', x]), ...updates.map((x) => ['u', x])], (b, [kind, x]) => (kind === 'c'
    ? b.set(doc(db, 'dues', dueId(period, x.unit.id)), { ...newDue(x.unit, period), amount: x.amount })
    : b.update(doc(db, 'dues', x.due.id), { amount: x.amount, updatedAt: serverTimestamp() })))
  return { created: creates.length, updated: updates.length }
}

/** Mark a bill paid. Creates the bill first if it was never generated for that unit/month. */
export async function recordPayment({ due, unit, period, amount, paidOn, mode, note }) {
  const fields = { amount: Number(amount) || 0, paidOn, mode, note: note.trim(), status: 'paid', updatedAt: serverTimestamp() }
  if (due) await updateDoc(doc(db, 'dues', due.id), fields)
  else await setDoc(doc(db, 'dues', dueId(period, unit.id)), { ...newDue(unit, period), ...fields })
  changed()
}

export const markUnpaid = (id) => updateDoc(doc(db, 'dues', id), { ...UNPAID, updatedAt: serverTimestamp() }).then(changed)
export const deleteDue = (id) => deleteDoc(doc(db, 'dues', id)).then(changed)

/** Income / expense entries. `period` is the month the entry is for; `date` is only for the record. */
export const saveEntry = (id, data) => (id
  ? updateDoc(doc(db, 'transactions', id), { ...data, updatedAt: serverTimestamp() })
  : addDoc(collection(db, 'transactions'), { ...data, createdAt: serverTimestamp() })).then(changed)
export const deleteEntry = (id) => deleteDoc(doc(db, 'transactions', id)).then(changed)
export const restoreEntry = (id, data) => setDoc(doc(db, 'transactions', id), data).then(changed)

/**
 * Plan unit numbers for a wing: floors × flats per floor (A-101, A-102 …) plus shops (Shop 1 …).
 */
export function planUnits({ prefix, floors, perFloor, startFloor, shops, flatAmount, shopAmount }) {
  const p = prefix.trim() ? `${prefix.trim()}-` : ''
  const list = []
  for (let f = startFloor; f < startFloor + floors; f++) {
    for (let n = 1; n <= perFloor; n++) list.push({ number: `${p}${f}${String(n).padStart(2, '0')}`, type: 'flat', maintenance: Number(flatAmount) || 0 })
  }
  for (let s = 1; s <= shops; s++) list.push({ number: `${p}Shop ${s}`, type: 'shop', maintenance: Number(shopAmount) || 0 })
  return list
}

const unitDoc = (u, wingId) => ({ wingId, number: u.number, type: u.type, ownerName: '', phone: '', maintenance: u.maintenance, createdAt: serverTimestamp() })

export const createUnits = (wingId, units) =>
  inBatches(units, (b, u) => b.set(doc(collection(db, 'units')), unitDoc(u, wingId)))

/** Create a wing and all its units in one go. Returns the wing id. */
export async function createWingWithUnits(name, units) {
  const ref = doc(collection(db, 'wings'))
  await setDoc(ref, { name, createdAt: serverTimestamp() })
  await createUnits(ref.id, units)
  return ref.id
}

/** Delete a wing with all its flats / shops and their phone numbers. Past payments and entries are kept. */
export async function deleteWing(wing, units) {
  await inBatches(units, (b, u) => { b.delete(doc(db, 'units', u.id)); if (u.phone) b.delete(doc(db, 'unitContacts', u.id)) })
  await deleteDoc(doc(db, 'wings', wing.id))
  changed()
}

/** Set the monthly maintenance for every flat / shop in a wing */
export const updateWingMaintenance = (units, { flatAmount, shopAmount }) =>
  inBatches(
    units.filter((u) => (u.type === 'shop' ? shopAmount !== '' && Number(shopAmount) !== u.maintenance : flatAmount !== '' && Number(flatAmount) !== u.maintenance)),
    (b, u) => b.update(doc(db, 'units', u.id), { maintenance: Number(u.type === 'shop' ? shopAmount : flatAmount) }),
  )
