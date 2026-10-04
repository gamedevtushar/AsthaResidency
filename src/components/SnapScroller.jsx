import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from './ui'
import { tick } from '../lib/feedback'

const FADE = 'linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)'

/**
 * Picker-style horizontal scroller. A highlight pill sits in the middle; whatever is in the pill when
 * scrolling comes to rest is the selected value — after a swipe, a fling, a mouse drag or a tap.
 * Items shrink and fade the further they are from the middle, so the neighbours peek in at the sides.
 * items: [{ value, label }]
 */
export default function SnapScroller({ items, value, onChange, className, itemWidth = '4.75rem' }) {
  const ref = useRef(null)
  const settle = useRef(0)
  const touching = useRef(false)
  const drag = useRef(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const index = Math.max(0, items.findIndex((x) => x.value === value))
  const [centre, setCentre] = useState(index)
  const centreRef = useRef(index)

  const nodes = () => [...(ref.current?.querySelectorAll('[data-item]') || [])]
  const nearest = () => {
    const el = ref.current
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0, dist = Infinity
    nodes().forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i } })
    return best
  }

  // Scale and fade each item by its distance from the middle (runs every scroll frame, no re-render)
  const paint = () => {
    const el = ref.current
    if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    for (const n of nodes()) {
      const d = Math.min(2, Math.abs(n.offsetLeft + n.offsetWidth / 2 - mid) / n.offsetWidth)
      n.style.transform = `scale(${1.08 - d * 0.14})`
      n.style.opacity = String(1 - d * 0.38)
    }
  }

  const scrollToIndex = (i, smooth) => {
    const el = ref.current
    const child = nodes()[i]
    if (!el || !child) return
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' })
    if (!smooth) paint()
  }

  // Scrolling has stopped: the item in the pill is the choice
  const settleNow = () => {
    if (touching.current || drag.current) return
    const i = nearest()
    const v = items[i]?.value
    if (v !== undefined && v !== valueRef.current) { valueRef.current = v; onChange(v) }
  }
  const settleSoon = (ms = 120) => { clearTimeout(settle.current); settle.current = setTimeout(settleNow, ms) }

  useLayoutEffect(() => { scrollToIndex(index, false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Value changed from outside (or the list changed): put it in the pill, unless a finger is on the strip
  useEffect(() => {
    centreRef.current = index
    setCentre(index)
    if (!touching.current && !drag.current && ref.current && nearest() !== index) scrollToIndex(index, false)
  }, [index, value, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    paint()
    const i = nearest()
    if (i !== centreRef.current) { centreRef.current = i; setCentre(i); tick('light') }
    settleSoon()
  }

  // Finger on the strip: never pick while touching; decide after it lets go and the fling stops
  const onTouchStart = () => { touching.current = true; clearTimeout(settle.current) }
  const onTouchEnd = () => { touching.current = false; settleSoon(180) }

  // Mouse drag (touch scrolling is native)
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false }
    ref.current.style.scrollSnapType = 'none'
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    if (Math.abs(e.clientX - d.x) > 3) d.moved = true
    ref.current.scrollLeft = d.left - (e.clientX - d.x)
  }
  const endDrag = () => {
    const d = drag.current
    if (!d) return
    ref.current.style.scrollSnapType = ''
    setTimeout(() => { drag.current = null; scrollToIndex(nearest(), true); settleSoon(300) }, 0) // a click right after a drag is ignored
  }

  const pick = (i) => {
    if (drag.current?.moved) return
    centreRef.current = i
    setCentre(i)
    tick('light')
    scrollToIndex(i, true)
    if (items[i].value !== valueRef.current) { valueRef.current = items[i].value; onChange(items[i].value) }
  }

  return (
    <div className={cx('relative', className)} data-no-tick>
      {/* the highlight pill in the middle */}
      <span aria-hidden className="pointer-events-none absolute inset-y-1 left-1/2 -translate-x-1/2 rounded-xl bg-accent/12 ring-1 ring-accent/35" style={{ width: itemWidth }} />
      <div ref={ref} onScroll={onScroll} onScrollEnd={() => settleSoon(40)}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
        className="no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain select-none"
        style={{ maskImage: FADE, WebkitMaskImage: FADE }}>
        {/* spacers let the first and last items reach the middle */}
        <span aria-hidden className="shrink-0" style={{ width: `calc(50% - ${itemWidth} / 2)` }} />
        {items.map((it, i) => (
          <button key={it.value} data-item type="button" style={{ width: itemWidth }} onClick={() => pick(i)}
            className={cx('flex h-11 shrink-0 snap-center snap-always items-center justify-center px-1 text-center whitespace-nowrap transition-colors duration-150 cursor-pointer',
              i === centre ? 'text-[0.9375rem] font-bold text-accent-ink' : 'text-sm font-semibold text-muted')}>
            {it.label}
          </button>
        ))}
        <span aria-hidden className="shrink-0" style={{ width: `calc(50% - ${itemWidth} / 2)` }} />
      </div>
    </div>
  )
}
