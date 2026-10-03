import { useMemo } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { periodRange } from '../lib/format'
import { periodOf } from '../lib/ledger'
import { useQuery } from './useQuery'

/** Live income / expense entries for a run of consecutive months (by the month they are for) */
export function useEntries(periods) {
  const key = periods.join()
  const [from, to] = periodRange(periods[0], periods[periods.length - 1])
  const byMonth = useQuery(() => query(collection(db, 'transactions'), where('period', 'in', periods)), [key])
  // Entries saved before months were recorded only have a date
  const byDate = useQuery(() => query(collection(db, 'transactions'), where('date', '>=', from), where('date', '<=', to)), [key])

  const data = useMemo(() => {
    const all = new Map([...byDate.data, ...byMonth.data].map((x) => [x.id, x]))
    return [...all.values()].filter((x) => periods.includes(periodOf(x)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byMonth.data, byDate.data, key])

  return { data, loading: byMonth.loading || byDate.loading }
}
