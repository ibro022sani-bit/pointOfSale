import jwt from 'jsonwebtoken'
import { tenantDb } from './tenantDb.js'

export function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' })
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    // Tokens issued before multi-tenancy have no tenant_id: force a fresh login
    if (!req.user.tenant_id) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
    }
    req.tenantId = req.user.tenant_id
    req.db = tenantDb(req.tenantId)
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