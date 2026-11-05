import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requirePlatformAdmin } from '../lib/middleware.js'
import { BUSINESS_TABLES } from '../lib/backupTables.js'

// Backups can only be made by the platform owner.
const router = express.Router()
router.use(requirePlatformAdmin)

const MAX_PAGE = 1000 // the most rows Supabase returns per request
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const businessPlan = ['tenants', ...BUSINESS_TABLES, 'referrals']
const fullPlan = ['tenants', ...BUSINESS_TABLES, 'referrers', 'referrals']
const allowed = new Set(fullPlan)

// The column that ties each table to one business (every other table uses tenant_id)
const SCOPE_COLUMN = { tenants: 'id', referrals: 'referred_tenant_id' }
const scopeColumn = (table) => SCOPE_COLUMN[table] || 'tenant_id'

// Which tables a backup includes, and how many rows each should have (used to check nothing is missing)
router.get('/plan', async (req, res) => {
  try {
    const tenantId = req.query.tenant ? String(req.query.tenant) : null
    if (tenantId && !UUID.test(tenantId)) return error(res, 'Invalid business')

    let business = null
    if (tenantId) {
      const { data: tenant } = await supabase.from('tenants').select('id, name').eq('id', tenantId).maybeSingle()
      if (!tenant) return error(res, 'Business not found', 404)
      business = tenant.name
    }

    const tables = tenantId ? businessPlan : fullPlan
    const counts = {}
    await Promise.all(
      tables.map(async (name) => {
        let query = supabase.from(name).select('id', { count: 'exact', head: true })
        if (tenantId) query = query.eq(scopeColumn(name), tenantId)
        const { count, error: countErr } = await query
        counts[name] = countErr ? null : count
      })
    )

    return success(res, { scope: tenantId ? 'business' : 'all', business, tables, counts }, 'Backup plan')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// One page of one table
router.get('/table/:name', async (req, res) => {
  try {
    const name = req.params.name
    if (!allowed.has(name)) return error(res, 'Unknown table', 404)

    const tenantId = req.query.tenant ? String(req.query.tenant) : null
    if (tenantId && !UUID.test(tenantId)) return error(res, 'Invalid business')
    if (tenantId && name === 'referrers') return error(res, 'Not part of a single-business backup')

    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)
    const limit = Math.min(MAX_PAGE, Math.max(1, parseInt(req.query.limit, 10) || 500))

    let query = supabase.from(name).select('*')
    if (tenantId) query = query.eq(scopeColumn(name), tenantId)
    const { data, error: dbError } = await query
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1)
    if (dbError) return error(res, `Could not read ${name}`, 500)

    return success(res, data, 'Rows')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router