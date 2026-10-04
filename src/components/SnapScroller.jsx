import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from './ui'
import { tick } from '../lib/feedback'

const FADE = 'linear-gradient(90deg, transparent, #000 28%, #000 72%, transparent)'

/**
 * Horizontal snap scroller: swipe and the centre item is picked. Each item that passes the centre
 * gives a soft click and vibration; the choice is made when the scroll settles.
 * The next and previous items peek in at the sides, faded. Tap an item to jump to it.
 * items: [{ value, label }]
 */
export default function SnapScroller({ items, value, onChange, className, itemClass = 'min-w-[5.5rem]' }) {
  const ref = useRef(null)
  const user = useRef(false) // only real swipes / wheel change the value, never our own scrolling
  const settle = useRef(0)
  const index = Math.max(0, items.findIndex((x) => x.value === value))
  const [centre, setCentre] = useState(index)
  const centreRef = useRef(index)

  const nodes = () => [...(ref.current?.querySelectorAll('[data-item]') || [])]
  const scrollToIndex = (i, smooth) => {
    const el = ref.current
    const child = nodes()[i]
    if (!el || !child) return
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' })
  }

  // Start centred on the current value and follow outside changes
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

  const onScroll = () => {
    if (!user.current) return
    const i = nearest()
    if (i !== centreRef.current) { centreRef.current = i; setCentre(i); tick('light') }
    clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      user.current = false
      const v = items[centreRef.current]?.value
      if (v !== undefined && v !== value) onChange(v)
    }, 160)
  }
  const start = () => { user.current = true }

  return (
    <div ref={ref} onScroll={onScroll} onTouchStart={start} onPointerDown={start} onWheel={start} data-no-tick
      className={cx('no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto', className)}
      style={{ maskImage: FADE, WebkitMaskImage: FADE }}>
      {/* spacers let the first and last items reach the centre */}
      <span aria-hidden className="w-1/2 shrink-0" />
      {items.map((it, i) => {
        const active = i === centre
        return (
          <button key={it.value} data-item type="button"
            onClick={() => { if (i !== centreRef.current) { user.current = false; centreRef.current = i; setCentre(i); tick('light'); scrollToIndex(i, true); onChange(it.value) } }}
            className={cx('h-10 shrink-0 snap-center px-2 text-center whitespace-nowrap transition-all duration-200 cursor-pointer', itemClass,
              active ? 'scale-105 text-base font-bold text-accent-ink' : 'text-sm font-medium text-subtle')}>
            {it.label}
          </button>
        )
      })}
      <span aria-hidden className="w-1/2 shrink-0" />
    </div>
  )
}
