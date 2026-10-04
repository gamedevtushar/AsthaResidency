import { t, tv } from '../i18n'
import { inr, periodLabel, shortDate } from './format'

/**
 * Printable A4 pictures (2480 × 3508 px = A4 at 300 dpi) on a white background,
 * in the current language. Drawn on a canvas and saved as a PNG.
 */
const W = 2480
const H = 3508
const M = 150 // page margin
const FONT = '"Inter", "Hind Vadodara", sans-serif'
const C = {
  ink: '#1c1917', muted: '#57534e', light: '#a8a29e', line: '#e7e5e4', soft: '#fafaf9',
  accent: '#ea580c', accent2: '#f59e0b', ok: '#059669', okSoft: '#d1fae5', bad: '#e11d48', badSoft: '#ffe4e6',
}
const FLOOR = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#14b8a6', '#ec4899', '#84cc16']

async function page() {
  // Make sure both fonts are ready, or Gujarati text would be drawn with a fallback font
  await Promise.all([document.fonts.load(`700 60px "Hind Vadodara"`, 'અ'), document.fonts.load(`700 60px "Inter"`, 'A')]).catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'middle'
  return { canvas, ctx }
}

function text(ctx, s, x, y, { size = 40, weight = 500, color = C.ink, align = 'left', max } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.fillStyle = color
  ctx.textAlign = align
  let str = String(s ?? '')
  // Shrink to fit instead of cutting text off
  if (max) while (ctx.measureText(str).width > max && size > 18) { size -= 2; ctx.font = `${weight} ${size}px ${FONT}` }
  ctx.fillText(str, x, y)
}

function box(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = stroke; ctx.stroke() }
}

/** Wrap text into at most `lines` lines that fit `max` px */
function wrap(ctx, s, max, lines) {
  const words = String(s || '').split(/\s+/).filter(Boolean)
  const out = ['']
  for (const w of words) {
    const next = out[out.length - 1] ? `${out[out.length - 1]} ${w}` : w
    if (ctx.measureText(next).width <= max || !out[out.length - 1]) out[out.length - 1] = next
    else if (out.length < lines) out.push(w)
    else break
  }
  return out.filter(Boolean)
}

function header(ctx, title, sub) {
  const g = ctx.createLinearGradient(0, 0, W, 0)
  g.addColorStop(0, C.accent)
  g.addColorStop(1, C.accent2)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, 330)
  text(ctx, t('appName'), M, 120, { size: 96, weight: 700, color: '#fff' })
  text(ctx, title, M, 230, { size: 60, weight: 600, color: '#fff' })
  if (sub) text(ctx, sub, W - M, 230, { size: 52, weight: 600, color: '#fff', align: 'right' })
}

function footer(ctx) {
  ctx.fillStyle = C.line
  ctx.fillRect(M, H - 150, W - 2 * M, 3)
  const now = new Date()
  text(ctx, t('img.generated', { d: shortDate(now.toISOString().slice(0, 10)) + ` ${now.getFullYear()}` }), M, H - 90, { size: 36, color: C.light })
  text(ctx, t('appName'), W - M, H - 90, { size: 36, color: C.light, align: 'right' })
}

/** Stat cards in one row */
function cards(ctx, y, items, h = 230) {
  const gap = 40
  const w = (W - 2 * M - gap * (items.length - 1)) / items.length
  items.forEach((it, i) => {
    const x = M + i * (w + gap)
    box(ctx, x, y, w, h, 28, it.fill || C.soft, it.fill ? null : C.line)
    text(ctx, it.label, x + w / 2, y + 70, { size: 42, weight: 600, color: it.fill ? '#fff' : C.muted, align: 'center', max: w - 40 })
    text(ctx, it.value, x + w / 2, y + 160, { size: 68, weight: 700, color: it.fill ? '#fff' : it.color, align: 'center', max: w - 40 })
  })
}

async function save(canvas, name) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const file = new File([blob], name, { type: 'image/png' })
  // Phones: offer the share sheet (Save image / WhatsApp); otherwise download
  if (navigator.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: name }); return } catch (e) { if (e?.name === 'AbortError') return }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/**
 * One month of one wing: summary, the building drawn floor by floor, then other income and expenses.
 * floors: [{ key, items: [{ label, amount, status }] }] top floor first, shops last
 */
export async function monthImage({ wingName, period, floors, entries, figures, totalBalance }) {
  const { canvas, ctx } = await page()
  header(ctx, `${t('nav.month')} · ${wingName}`, periodLabel(period))

  cards(ctx, 400, [
    { label: `${wingName} · ${t('r.balance')}`, value: inr(totalBalance), fill: totalBalance < 0 ? C.bad : C.accent },
    { label: t('mo.collectedShort'), value: inr(figures.collected), color: C.ok },
    { label: t('mo.pending'), value: inr(figures.pending), color: figures.pending ? C.bad : C.ink },
  ])
  cards(ctx, 670, [
    { label: t('income'), value: inr(figures.income), color: C.ok },
    { label: t('expense'), value: inr(figures.expense), color: C.bad },
    { label: t('img.monthBalance'), value: inr(figures.collected + figures.income - figures.expense), color: C.ink },
  ])

  // --- Building ---
  let y = 990
  text(ctx, t('mo.maintenance'), M, y, { size: 56, weight: 700 })
  const legend = [[C.ok, t('paid')], [C.bad, t('unpaid')]]
  let lx = W - M
  for (const [col, label] of [...legend].reverse()) {
    ctx.font = `600 38px ${FONT}`
    const tw = ctx.measureText(label).width
    text(ctx, label, lx, y, { size: 38, weight: 600, color: C.muted, align: 'right' })
    box(ctx, lx - tw - 70, y - 22, 44, 44, 10, col)
    lx -= tw + 130
  }
  y += 70
  const PER = 8
  const lines = floors.flatMap((f) => { const out = []; for (let i = 0; i < f.items.length; i += PER) out.push({ ...f, items: f.items.slice(i, i + PER) }); return out })
  const shopGap = floors.some((f) => f.key === 'shop') ? 50 : 0
  const area = 2020 - y - shopGap
  const gap = 24
  const bh = Math.max(90, Math.min(190, (area - gap * (lines.length - 1)) / Math.max(1, lines.length)))
  lines.forEach((f, li) => {
    if (f.key === 'shop' && lines[li - 1]?.key !== 'shop') y += shopGap
    const color = f.key === 'shop' ? '#78716c' : FLOOR[Math.max(0, Number(f.key) - 1) % FLOOR.length]
    box(ctx, M, y, 16, bh, 8, color) // floor colour strip
    const cols = Math.max(1, f.items.length)
    const w = (W - 2 * M - 40 - gap * (cols - 1)) / cols
    f.items.forEach((u, i) => {
      const x = M + 40 + i * (w + gap)
      const paid = u.status === 'paid'
      box(ctx, x, y, w, bh, 22, paid ? C.ok : u.status === 'due' ? C.badSoft : C.soft, paid ? null : u.status === 'due' ? C.bad : C.line)
      const big = Math.min(64, bh * 0.36)
      text(ctx, u.label, x + w / 2, y + bh * 0.38, { size: big, weight: 700, color: paid ? '#fff' : u.status === 'due' ? C.bad : C.light, align: 'center', max: w - 24 })
      text(ctx, inr(paid ? u.amount : 0), x + w / 2, y + bh * 0.74, { size: big * 0.66, weight: 600, color: paid ? '#ecfdf5' : u.status === 'due' ? C.bad : C.light, align: 'center', max: w - 24 })
    })
    y += bh + gap
  })

  // --- Other income and expenses ---
  y += 70
  text(ctx, t('mo.entries'), M, y, { size: 56, weight: 700 })
  y += 60
  const room = H - 200 - y
  const rowH = Math.max(56, Math.min(110, room / Math.max(1, entries.length)))
  const fit = Math.floor(room / rowH)
  const shown = entries.slice(0, entries.length > fit ? fit - 1 : fit)
  if (!entries.length) text(ctx, t('a.empty'), M, y + 60, { size: 42, color: C.light })
  shown.forEach((x, i) => {
    const ry = y + i * rowH
    if (i % 2 === 0) box(ctx, M, ry, W - 2 * M, rowH, 16, C.soft)
    const fs = Math.min(44, rowH * 0.42)
    const isIn = x.type === 'income'
    text(ctx, shortDate(x.date), M + 30, ry + rowH / 2, { size: fs * 0.9, color: C.muted })
    text(ctx, tv(x.category) + (x.wingId ? '' : ` (${t('common')})`), M + 330, ry + rowH / 2, { size: fs, weight: 600, max: 820 })
    ctx.font = `400 ${fs * 0.85}px ${FONT}`
    const desc = wrap(ctx, x.description, 760, 1)[0] || ''
    text(ctx, desc, M + 1180, ry + rowH / 2, { size: fs * 0.85, color: C.muted, max: 760 })
    text(ctx, `${isIn ? '+' : '−'}${inr(x.amount)}`, W - M - 30, ry + rowH / 2, { size: fs, weight: 700, color: isIn ? C.ok : C.bad, align: 'right' })
  })
  if (entries.length > shown.length) text(ctx, t('img.more', { n: entries.length - shown.length }), M + 30, y + shown.length * rowH + rowH / 2, { size: 40, color: C.muted })

  footer(ctx)
  await save(canvas, `${t('appName')} - ${wingName} - ${period}.png`)
}

/** One calendar year: bar chart of money in and out with the balance line, then the table */
export async function yearImage({ wingName, year, opening, rows, totIn, totOut }) {
  const { canvas, ctx } = await page()
  header(ctx, `${t('nav.reports')} · ${wingName}`, t('r.year', { y: year }))
  const closing = rows.filter((r) => !r.future).at(-1)?.balance ?? opening
  cards(ctx, 400, [
    { label: t('r.broughtForward'), value: inr(opening), color: C.ink },
    { label: t('r.in'), value: inr(totIn), color: C.ok },
    { label: t('r.out'), value: inr(totOut), color: C.bad },
    { label: t('r.balance'), value: inr(closing), fill: closing < 0 ? C.bad : C.accent },
  ])

  // --- Chart ---
  const top = 760
  const chartH = 1000
  const left = M + 40
  const right = W - M
  const bottom = top + chartH
  const peak = Math.max(1, ...rows.map((r) => Math.max(r.inn, r.out)))
  const step = (right - left) / 12
  const bw = step * 0.3
  ctx.fillStyle = C.line
  for (let g = 0; g <= 4; g++) ctx.fillRect(left, bottom - (chartH * g) / 4, right - left, 2)
  rows.forEach((r, i) => {
    const cx = left + step * i + step / 2
    const hIn = (r.inn / peak) * (chartH - 60)
    const hOut = (r.out / peak) * (chartH - 60)
    if (hIn) box(ctx, cx - bw - 6, bottom - hIn, bw, hIn, 10, C.ok)
    if (hOut) box(ctx, cx + 6, bottom - hOut, bw, hOut, 10, C.bad)
    text(ctx, periodLabel(r.p, true).split(' ')[0], cx, bottom + 50, { size: 38, weight: 600, color: C.muted, align: 'center', max: step - 10 })
  })
  // legend
  const lg = [[C.ok, t('r.in')], [C.bad, t('r.out')]]
  let lx = left
  for (const [col, label] of lg) {
    box(ctx, lx, top - 60, 44, 44, 10, col)
    text(ctx, label, lx + 64, top - 38, { size: 40, weight: 600, color: C.muted })
    ctx.font = `600 40px ${FONT}`
    lx += 64 + ctx.measureText(label).width + 70
  }

  // --- Table ---
  let y = bottom + 140
  const cols = [M + 30, 1050, 1620, W - M - 30]
  const rowH = 88
  box(ctx, M, y, W - 2 * M, rowH, 18, '#f5f5f4')
  ;[t('r.month'), t('r.in'), t('r.out'), t('r.balance')].forEach((h, i) => text(ctx, h, cols[i], y + rowH / 2, { size: 42, weight: 700, color: C.muted, align: i ? 'right' : 'left' }))
  y += rowH
  const line = (label, a, b, c, bold, fill) => {
    if (fill) box(ctx, M, y, W - 2 * M, rowH, 18, fill)
    text(ctx, label, cols[0], y + rowH / 2, { size: 44, weight: bold ? 700 : 600 })
    if (a !== null) text(ctx, a, cols[1], y + rowH / 2, { size: 44, weight: bold ? 700 : 500, color: C.ok, align: 'right' })
    if (b !== null) text(ctx, b, cols[2], y + rowH / 2, { size: 44, weight: bold ? 700 : 500, color: C.bad, align: 'right' })
    text(ctx, c, cols[3], y + rowH / 2, { size: 44, weight: 700, align: 'right' })
    ctx.fillStyle = C.line
    ctx.fillRect(M, y + rowH - 2, W - 2 * M, 2)
    y += rowH
  }
  line(t('r.broughtForward'), null, null, inr(opening), false, '#fff7ed')
  rows.forEach((r) => (r.future ? line(periodLabel(r.p), null, null, '—') : line(periodLabel(r.p), inr(r.inn), inr(r.out), inr(r.balance))))
  line(t('r.total'), inr(totIn), inr(totOut), inr(closing), true, '#f5f5f4')

  footer(ctx)
  await save(canvas, `${t('appName')} - ${wingName} - ${year}.png`)
}
