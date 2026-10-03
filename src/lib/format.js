import { locale } from '../i18n'

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const inr = (n) => inrFormatter.format(Number(n) || 0)

/** Compact rupees for tight spaces: ₹45,000 · ₹1.25L · ₹2.1Cr (never cut off with "…") */
export const inrShort = (n) => {
  const v = Number(n) || 0
  const a = Math.abs(v)
  if (a < 100000) return inr(v)
  const [d, u] = a >= 1e7 ? [1e7, 'Cr'] : [1e5, 'L']
  return `${v < 0 ? '−' : ''}₹${+(a / d).toFixed(2)}${u}`
}

const pad = (n) => String(n).padStart(2, '0')

/** "2026-10" for the current month */
export const currentPeriod = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** Accounts are settled a month later, so screens and forms start on last month */
export const defaultPeriod = () => shiftPeriod(currentPeriod(), -1)

/** "YYYY-MM-DD" for today minus n days */
export const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const today = () => daysAgo(0)

/** "2026-10" → "Oct 2026" */
export const periodLabel = (p, short = false) => {
  const [y, m] = p.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: short ? 'short' : 'long', year: short ? '2-digit' : 'numeric' })
}

export const shiftPeriod = (p, delta) => {
  const [y, m] = p.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** First and last date (YYYY-MM-DD) of a period range */
export const periodRange = (from, to = from) => {
  const [y, m] = to.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return [`${from}-01`, `${to}-${pad(lastDay)}`]
}

/** "2026-10-05" → "5 Oct" */
export const shortDate = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) : '—'

export const dateLabel = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const sum = (arr, key = 'amount') => arr.reduce((t, x) => t + (Number(x[key]) || 0), 0)

/** Natural sort for unit numbers like "A-101", "A-1002", "Shop 3" */
export const byNumber = (a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true })

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque']

export const EXPENSE_CATEGORIES = [
  'Electricity', 'Water', 'Security', 'Housekeeping', 'Lift Maintenance', 'Repairs',
  'Garden', 'Salary', 'Plumbing', 'Painting', 'Stationery', 'Other',
]

export const INCOME_CATEGORIES = ['Late Fee / Penalty', 'Parking', 'Rent', 'Donation', 'Interest', 'Opening Balance', 'Other']
