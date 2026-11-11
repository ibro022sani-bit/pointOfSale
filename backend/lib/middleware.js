import jwt from 'jsonwebtoken'
import supabase from './supabase.js'
import { tenantDb } from './tenantDb.js'
import { isExpired, autoDeactivate } from './subscription.js'

// Business status and user status are checked on EVERY request (cached 30s), so deactivating
// a business or a staff member locks them out even if they are already logged in.
const STATUS_TTL_MS = 30 * 1000
const statusCache = new Map()
const userCache = new Map()

export function clearTenantStatusCache(tenantId) {
  statusCache.delete(tenantId)
}

async function getTenantStatus(tenantId) {
  const hit = statusCache.get(tenantId)
  if (hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.status
  const { data, error } = await supabase
    .from('tenants').select('id, status, paid_until').eq('id', tenantId).maybeSingle()
  if (error) throw error
  let status = data?.status || 'missing'
  // Subscription ran out (including the grace period): deactivate automatically
  if (data && isExpired(data)) {
    status = 'deactivated'
    await autoDeactivate(data)
  }
  statusCache.set(tenantId, { status, at: Date.now() })
  return status
}

async function isUserActive(userId) {
  const hit = userCache.get(userId)
  if (hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.active
  const { data, error } = await supabase.from('users').select('is_active').eq('id', userId).maybeSingle()
  if (error) throw error
  const active = !!data?.is_active
  userCache.set(userId, { active, at: Date.now() })
  return active
}

const INACTIVE_MESSAGES = {
  pending: 'Your account is awaiting activation. Please contact support.',
  deactivated: 'This account has been Suspended. Please make payment to reactivate it.',
  archived: 'This account has been archived. Please contact support to have it restored.',
}

export async function requireAuth(req, res, next) {
  let user
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' })
    user = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }

  if (!user.tenant_id) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
  }

  try {
    const status = await getTenantStatus(user.tenant_id)
    if (status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: INACTIVE_MESSAGES[status] || INACTIVE_MESSAGES.deactivated,
      })
    }
    if (!(await isUserActive(user.id))) {
      return res.status(401).json({ success: false, message: 'Your account has been Suspended.' })
    }
  } catch (err) {
    return res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again.' })
  }

  req.user = user
  req.tenantId = user.tenant_id
  req.db = tenantDb(user.tenant_id)
  next()
}

export async function requirePlatformAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' })
    const user = jwt.verify(token, process.env.JWT_SECRET)
    if (user.role !== 'platform_admin') return res.status(403).json({ success: false, message: 'Unauthorized' })
    if (!(await isUserActive(user.id))) return res.status(401).json({ success: false, message: 'Account deactivated' })
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }
    next()
  }
}