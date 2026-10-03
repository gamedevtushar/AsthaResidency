import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Pencil, Building2, Store, Home, Layers, Trash2 } from 'lucide-react'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { inr, sum } from '../lib/format'
import { t } from '../i18n'
import { Button, Card, EmptyState, Menu, PageHeader, ScrollCard, Segmented, Spinner, confirmDialog, cx, reveal, toast } from '../components/ui'
import { SearchBox } from '../components/filters'
import { forms } from '../components/forms'

export default function Units() {
  const { isSuper, isAdmin, canEdit, profile } = useAuth()
  const { wings, units, loading } = useData()
  const [wingTab, setWingTab] = useState(profile?.role === 'wing_admin' ? profile.wingId : '')
  const [typeTab, setTypeTab] = useState('')
  const [search, setSearch] = useState('')

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return units.filter((u) => (!wingTab || u.wingId === wingTab) && (!typeTab || u.type === typeTab)
      && (!q || `${u.number} ${u.ownerName} ${u.phone}`.toLowerCase().includes(q)))
  }, [units, wingTab, typeTab, search])
  const groups = wings.filter((w) => !wingTab || w.id === wingTab).map((w) => ({ wing: w, items: shown.filter((u) => u.wingId === w.id) }))
    .filter((g) => g.items.length || (canEdit(g.wing.id) && !search && !typeTab))

  if (loading) return <Spinner />
  const count = (list, type) => list.filter((u) => u.type === type).length
  const canAddUnit = wings.some((w) => canEdit(w.id))

  const removeWing = async (w) => {
    if (units.some((u) => u.wingId === w.id)) return toast.warning(t('u.removeUnitsFirst'), { title: w.name })
    if (!(await confirmDialog({ message: t('u.confirmDeleteWing', { n: w.name }), confirmText: t('delete') }))) return
    try { await deleteDoc(doc(db, 'wings', w.id)); setWingTab(''); toast.success(t('u.wingDeleted'), { title: w.name }) } catch (e) { toast.error(e) }
  }

  return (
    <>
      <PageHeader title={t('nav.units')}
        subtitle={t('u.subtitle', { w: wings.length, f: count(units, 'flat'), s: count(units, 'shop') })}
        actions={<>
          {isSuper && <Button variant="secondary" icon={Building2} onClick={() => forms.open('wing')}>{t('u.addWing')}</Button>}
          {isAdmin && canAddUnit && <Button icon={Plus} onClick={() => forms.open('unit', { wingId: wingTab })}>{t('u.addUnit')}</Button>}
        </>} />

      {wings.length === 0 ? (
        <Card><EmptyState icon={Building2} title={t('u.noWings')}
          text={isSuper ? t('u.noWingsAdmin') : t('u.noWingsViewer')}
          action={isSuper && <Button icon={Layers} onClick={() => forms.open('wing')}>{t('u.setupFirst')}</Button>} /></Card>
      ) : <>
        {/* Wing cards */}
        <div className="no-scrollbar -mx-4 mb-3 flex shrink-0 gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:mb-4 lg:px-0">
          {wings.map((w) => {
            const wu = units.filter((u) => u.wingId === w.id)
            const active = wingTab === w.id
            const editable = canEdit(w.id)
            return (
              <Card key={w.id} hover onClick={() => setWingTab(active ? '' : w.id)}
                className={cx('relative w-52 shrink-0 cursor-pointer overflow-hidden p-4', active && 'ring-2 ring-accent/60')}>
                {active && <motion.div layoutId="wing-glow" className="pointer-events-none absolute inset-0 bg-accent/10" />}
                <div className="relative flex items-start justify-between gap-2">
                  <p className="truncate text-base font-bold text-fg">{w.name}</p>
                  {editable && (
                    <Menu className="-mr-1 -mt-1" items={[
                      { label: t('u.addUnitsShort'), icon: Layers, onClick: () => forms.open('wing', { wing: w }) },
                      { label: t('u.editWingMaint'), icon: Pencil, onClick: () => forms.open('wingEdit', { wing: w }) },
                      isSuper && { label: t('u.deleteWing'), icon: Trash2, danger: true, onClick: () => removeWing(w) },
                    ]} />
                  )}
                </div>
                <p className="relative mt-1 text-xs text-muted">{t('u.wingCount', { f: count(wu, 'flat'), s: count(wu, 'shop') })}</p>
                <p className="relative mt-3 text-lg font-bold text-fg">{inr(sum(wu, 'maintenance'))}<span className="text-xs font-normal text-subtle">{t('perMonth')}</span></p>
              </Card>
            )
          })}
        </div>

        <motion.div variants={reveal} className="mb-3 flex shrink-0 flex-wrap gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder={t('u.search')} className="min-w-[8rem] flex-1 lg:max-w-xs" />
          <Segmented value={typeTab} onChange={setTypeTab}
            options={[{ value: '', label: t('all') }, { value: 'flat', label: t('flats') }, { value: 'shop', label: t('shops') }]} />
        </motion.div>

        <ScrollCard bodyClass="p-4">
          {groups.length === 0 ? <EmptyState icon={Home} title={t('u.noUnits')} text={t('u.noUnitsText')} /> : (
            <div className="space-y-5">
              {groups.map(({ wing: w, items }) => (
                <section key={w.id}>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg">{w.name}</h3>
                    <span className="text-xs text-subtle">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2.5">
                    {items.map((u, i) => {
                      const editable = canEdit(u.wingId)
                      return (
                        <motion.button key={u.id} type="button" disabled={!editable}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }}
                          whileTap={editable ? { scale: 0.94 } : undefined} onClick={() => forms.open('unit', { unit: u })}
                          className={cx('flex flex-col items-start rounded-2xl border border-fg/10 bg-fg/[0.04] p-3 text-left transition-colors disabled:cursor-default',
                            editable && 'cursor-pointer hover:border-fg/20 hover:bg-fg/[0.09]')}>
                          <span className="flex w-full items-center justify-between gap-1">
                            <span className="truncate text-sm font-bold text-fg">{u.number}</span>
                            {u.type === 'shop' ? <Store className="size-3.5 shrink-0 text-warn" /> : <Home className="size-3.5 shrink-0 text-subtle" />}
                          </span>
                          <span className={cx('mt-0.5 w-full truncate text-[0.8125rem]', u.ownerName ? 'text-muted' : 'italic text-subtle')}>{u.ownerName || t('noOwner')}</span>
                          <span className="mt-2 text-xs font-semibold text-accent-ink">{inr(u.maintenance)}</span>
                        </motion.button>
                      )
                    })}
                    {canEdit(w.id) && !search && !typeTab && (
                      <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => forms.open('unit', { wingId: w.id })} aria-label={t('u.addUnit')}
                        className="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-fg/20 text-subtle transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent-ink cursor-pointer">
                        <Plus className="size-5" /><span className="text-[0.8125rem] font-medium">{t('u.addUnit')}</span>
                      </motion.button>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </ScrollCard>
      </>}
    </>
  )
}
