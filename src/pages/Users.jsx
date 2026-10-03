import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { collection } from 'firebase/firestore'
import { UserPlus, Users as UsersIcon, Info, ChevronRight } from 'lucide-react'
import { db, toLoginId } from '../firebase'
import { useAuth, roleLabel } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useQuery } from '../hooks/useQuery'
import { t } from '../i18n'
import { Badge, Button, EmptyState, PageHeader, ScrollCard, SkeletonList, cx, reveal } from '../components/ui'
import { SearchBox } from '../components/filters'
import { forms } from '../components/forms'

const ROLE_COLORS = { super_admin: 'blue', wing_admin: 'amber', viewer: 'green', disabled: 'red' }
const AVATAR = { super_admin: 'bg-accent/12 text-accent-ink', wing_admin: 'bg-warn/12 text-warn', viewer: 'bg-ok/12 text-ok', disabled: 'bg-fg/[0.07] text-muted' }

export default function UsersPage() {
  const { user } = useAuth()
  const { wingName } = useData()
  const { data: users, loading } = useQuery(() => collection(db, 'users'), [])
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q)).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [users, search])

  return (
    <>
      <PageHeader title={t('nav.users')} subtitle={t('us.count', { n: users.length })}
        actions={<Button icon={UserPlus} onClick={() => forms.open('user')}>{t('us.add')}</Button>} />

      <motion.div variants={reveal} className="mb-3 flex shrink-0 items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder={t('us.search')} className="min-w-0 flex-1 lg:max-w-xs" />
        <p className="hidden items-center gap-2 text-xs text-muted lg:flex"><Info className="size-4 text-info" />{t('us.tapToEdit')}</p>
      </motion.div>

      <ScrollCard>
        {loading ? <SkeletonList /> : sorted.length === 0 ? <EmptyState icon={UsersIcon} title={t('us.none')} /> : (
          <ul className="divide-y divide-fg/[0.06]">
            {sorted.map((u, i) => {
              const self = u.id === user.uid
              return (
                <motion.li key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 14) * 0.03 }}
                  onClick={() => forms.open('user', { user: u })}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-fg/[0.06]">
                  <div className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl font-bold', AVATAR[u.role] || AVATAR.disabled)}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-fg">
                      <span className="truncate">{u.name}</span>
                      {self && <span className="text-xs font-normal text-subtle">{t('us.you')}</span>}
                    </p>
                    <p className="truncate text-sm text-muted">@{toLoginId(u.email)}</p>
                  </div>
                  <Badge color={ROLE_COLORS[u.role]} dot>{roleLabel(u.role)}{u.role === 'wing_admin' && ` · ${wingName(u.wingId)}`}</Badge>
                  <ChevronRight className="size-4 shrink-0 text-subtle" />
                </motion.li>
              )
            })}
          </ul>
        )}
      </ScrollCard>
      <p className="mt-3 shrink-0 text-xs leading-relaxed text-subtle">{t('us.forgotNote')}</p>
    </>
  )
}
