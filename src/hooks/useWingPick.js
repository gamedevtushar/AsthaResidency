import { useSyncExternalStore } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { t } from '../i18n'

/** The wing being looked at, shared by Accounts and Reports. 'common' = whole-building income and expenses. */
let picked = ''
const listeners = new Set()
const set = (v) => { picked = v; listeners.forEach((l) => l()) }

export function useWingPick() {
  const { profile } = useAuth()
  const { wings } = useData()
  const value = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => picked)
  const options = [...wings.map((w) => ({ value: w.id, label: w.name })), { value: 'common', label: t('common') }]
  const fallback = profile?.role === 'wing_admin' && wings.some((w) => w.id === profile.wingId) ? profile.wingId : wings[0]?.id || 'common'
  const wing = options.some((o) => o.value === value) ? value : fallback
  return { wing, setWing: set, options, isCommon: wing === 'common', label: options.find((o) => o.value === wing)?.label || '' }
}
