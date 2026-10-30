import jwt from 'jsonwebtoken'
import supabase from './supabase.js'
import { tenantDb } from './tenantDb.js'

// Tenant status is checked on EVERY request (cached 30s), so deactivating a
// business locks out users who are already logged in, not just new logins.
const STATUS_TTL_MS = 30 * 1000
const statusCache = new Map()

export function clearTenantStatusCache(tenantId) {
  statusCache.delete(tenantId)
}

async function getTenantStatus(tenantId) {
  const hit = statusCache.get(tenantId)
  if (hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.status
  const { data, error } = await supabase.from('tenants').select('status').eq('id', tenantId).maybeSingle()
  if (error) throw error
  const status = data?.status || 'missing'
  statusCache.set(tenantId, { status, at: Date.now() })
  return status
}

const INACTIVE_MESSAGES = {
  pending: 'Your account is awaiting activation. Please contact support.',
  suspended: 'This account has been deactivated. Please make payment to reactivate it.',
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
        message: INACTIVE_MESSAGES[status] || INACTIVE_MESSAGES.suspended,
      })
    }
  } catch (err) {
    return res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again.' })
  }

  req.user = user
  req.tenantId = user.tenant_id
  req.db = tenantDb(user.tenant_id)
  next()
}

export function requirePlatformAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' })
    const user = jwt.verify(token, process.env.JWT_SECRET)
    if (user.role !== 'platform_admin') return res.status(403).json({ success: false, message: 'Unauthorized' })
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