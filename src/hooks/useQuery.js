import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'

/**
 * Live Firestore query. `makeQuery` returns a query (or null to skip);
 * it is re-run whenever `deps` change.
 */
export function useQuery(makeQuery, deps) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = makeQuery()
    if (!q) { setData([]); return }
    setData(null)
    return onSnapshot(
      q,
      (s) => { setData(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setError(null) },
      (e) => { console.error(e); setError(e); setData([]) },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data: data || [], loading: data === null, error }
}
