export const METHODS = ['cash', 'transfer', 'pos', 'other']
export const ADMIN_BACKDATE_DAYS = 31 // managers can date an expense up to this many days back; the owner has no limit

// Today's date in Lagos (UTC+1 all year), as YYYY-MM-DD
export const todayLagos = (now = new Date()) => new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10)

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value // rejects 2026-02-30
}

export const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

// Returns a message when the date is not allowed, or null when it is fine
export function checkExpenseDate(date, role, now = new Date()) {
  if (!isValidDate(date)) return 'Enter a valid date'
  const today = todayLagos(now)
  if (date > today) return 'An expense cannot be dated in the future'
  if (role !== 'super_admin' && daysBetween(date, today) > ADMIN_BACKDATE_DAYS) {
    return `Managers can record expenses up to ${ADMIN_BACKDATE_DAYS} days back. Ask the owner for older ones.`
  }
  return null
}

// Trimmed text, cut to a safe length. Empty becomes null.
export const cleanText = (value, max) => String(value ?? '').trim().slice(0, max) || null

// A positive amount with at most 2 decimals, or null
export function readAmount(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 && n < 1e12 ? Math.round(n * 100) / 100 : null
}