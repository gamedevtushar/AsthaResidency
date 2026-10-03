import { byNumber, currentPeriod } from './format'

/**
 * Everything is kept month-wise: a maintenance payment or an expense belongs to the month it is FOR
 * (its `period`), not the day the money moved. People often pay October's maintenance in November.
 */

/** The month an entry belongs to. Older entries without a month fall back to their date. */
export const periodOf = (x) => x.period || (x.date || '').slice(0, 7)

/** Month a unit starts owing maintenance: the month it was added to the app ('' if unknown) */
export function unitStart(u) {
  const d = u.createdAt?.toDate?.() ?? (u.createdAt ? new Date(u.createdAt) : null)
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : ''
}

/**
 * Every unit's maintenance for one month, whether a bill was created or not.
 * status: 'paid' | 'due' (still to pay) | 'none' (not due: before the unit was added, or a future month)
 */
export function monthDues(units, dues, period) {
  const byUnit = new Map(dues.filter((d) => d.period === period).map((d) => [d.unitId, d]))
  const now = currentPeriod()
  const rows = units.map((u) => {
    const due = byUnit.get(u.id)
    byUnit.delete(u.id)
    const amount = Number(due?.amount ?? u.maintenance) || 0
    const owes = due || (amount > 0 && period >= unitStart(u) && period <= now)
    return {
      id: u.id, unit: u, due, number: u.number, wingId: u.wingId, type: u.type, ownerName: u.ownerName || '',
      amount, paidOn: due?.paidOn || '', mode: due?.mode || '',
      status: due?.status === 'paid' ? 'paid' : owes ? 'due' : 'none',
    }
  })
  // Bills of units that were deleted later still count
  for (const d of byUnit.values()) {
    rows.push({
      id: d.unitId, unit: null, due: d, number: d.number, wingId: d.wingId, type: d.type, ownerName: d.ownerName || '',
      amount: Number(d.amount) || 0, paidOn: d.paidOn || '', mode: d.mode || '', status: d.status === 'paid' ? 'paid' : 'due',
    })
  }
  return rows.sort(byNumber)
}
