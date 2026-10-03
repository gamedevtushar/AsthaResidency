import { useEffect, useState } from 'react'
import { collection, getAggregateFromServer, query, sum, where } from 'firebase/firestore'
import { db } from '../firebase'
import { onMoneyChange } from '../lib/actions'

/** Server-side total of `amount` (cheap: no documents are downloaded) */
const total = (name, ...filters) =>
  getAggregateFromServer(query(collection(db, name), ...filters), { v: sum('amount') }).then((s) => Number(s.data().v) || 0)

/**
 * All-time balance per wing, plus common (whole building) income and expenses.
 * Returns rows: { id: wingId | '' for common, maint, income, expense, balance }
 */
export function useBalances(wings) {
  const [rows, setRows] = useState(null)
  const [version, setVersion] = useState(0)
  const key = wings.map((w) => w.id).join()

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    const onVisible = () => document.visibilityState === 'visible' && bump()
    document.addEventListener('visibilitychange', onVisible)
    const off = onMoneyChange(bump)
    return () => { document.removeEventListener('visibilitychange', onVisible); off() }
  }, [])

  useEffect(() => {
    let live = true
    const ids = [...wings.map((w) => w.id), '']
    Promise.all(ids.map(async (id) => {
      const [maint, income, expense] = await Promise.all([
        id ? total('dues', where('wingId', '==', id), where('status', '==', 'paid')) : 0,
        total('transactions', where('wingId', '==', id), where('type', '==', 'income')),
        total('transactions', where('wingId', '==', id), where('type', '==', 'expense')),
      ])
      return { id, maint, income, expense, balance: maint + income - expense }
    }))
      .then((r) => live && setRows(r))
      .catch((e) => { console.error(e); if (live) setRows((old) => old || []) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])

  return { rows: rows || [], loading: rows === null }
}
