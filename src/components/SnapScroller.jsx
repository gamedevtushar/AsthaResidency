import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from './ui'
import { tick } from '../lib/feedback'

const FADE = 'linear-gradient(90deg, transparent, #000 22%, #000 78%, transparent)'

/**
 * Picker-style horizontal scroller. A highlight pill sits in the middle; swipe and the items snap
 * into it one at a time (with a small vibration). Items shrink and fade the further they are from
 * the middle, so the previous and next ones peek in at the sides. Tap a side item to jump to it;
 * on a computer the strip can also be dragged with the mouse.
 * items: [{ value, label }]
 */
export default function SnapScroller({ items, value, onChange, className, itemWidth = '4.75rem' }) {
  const ref = useRef(null)
  const user = useRef(false) // only real swipes / drags change the value, never our own scrolling
  const settle = useRef(0)
  const drag = useRef(null)
  const index = Math.max(0, items.findIndex((x) => x.value === value))
  const [centre, setCentre] = useState(index)
  const centreRef = useRef(index)

  const nodes = () => [...(ref.current?.querySelectorAll('[data-item]') || [])]

  // Scale and fade each item by its distance from the middle (no re-render, runs every scroll frame)
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

  useLayoutEffect(() => { scrollToIndex(index, false) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user.current) return
    centreRef.current = index
    setCentre(index)
    scrollToIndex(index, false)
  }, [index, value, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const nearest = () => {
    const el = ref.current
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0, dist = Infinity
    nodes().forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i } })
    return best
  }

  const commit = () => {
    user.current = false
    const v = items[centreRef.current]?.value
    if (v !== undefined && v !== value) onChange(v)
  }

  const onScroll = () => {
    paint()
    if (!user.current) return
    const i = nearest()
    if (i !== centreRef.current) { centreRef.current = i; setCentre(i); tick('light') }
    clearTimeout(settle.current)
    if (!drag.current) settle.current = setTimeout(commit, 140)
  }

  // Mouse drag (touch scrolling is native)
  const onPointerDown = (e) => {
    user.current = true
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
    scrollToIndex(centreRef.current, true)
    clearTimeout(settle.current)
    settle.current = setTimeout(commit, 250)
    setTimeout(() => { drag.current = null }, 0) // let the click after a drag be ignored
  }

  return (
    <div className={cx('relative', className)} data-no-tick>
      {/* the highlight pill in the middle */}
      <span aria-hidden className="pointer-events-none absolute inset-y-1 left-1/2 -translate-x-1/2 rounded-xl bg-accent/12 ring-1 ring-accent/35" style={{ width: itemWidth }} />
      <div ref={ref} onScroll={onScroll} onTouchStart={() => { user.current = true }} onWheel={() => { user.current = true }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
        className="no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain select-none"
        style={{ maskImage: FADE, WebkitMaskImage: FADE }}>
        {/* spacers let the first and last items reach the middle */}
        <span aria-hidden className="shrink-0" style={{ width: `calc(50% - ${itemWidth} / 2)` }} />
        {items.map((it, i) => (
          <button key={it.value} data-item type="button" style={{ width: itemWidth }}
            onClick={() => { if (drag.current?.moved) return; if (i !== centreRef.current) { user.current = false; centreRef.current = i; setCentre(i); tick('light'); scrollToIndex(i, true); onChange(it.value) } }}
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
