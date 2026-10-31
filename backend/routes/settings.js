import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)

router.get('/business', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('tenants')
      .select('id, name, slug, phone, address, receipt_footer, sms_sender_id, status, paid_until')
      .eq('id', req.tenantId)
      .single()
    if (dbError || !data) return error(res, 'Could not fetch business profile', 500)
    return success(res, data, 'Business profile fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/business', requireRole('super_admin'), async (req, res) => {
  try {
    const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)
    const updates = {}

    const name = clean(req.body.name, 80)
    if (name !== undefined) {
      if (!name) return error(res, 'Business name cannot be empty')
      updates.name = name
    }
    const phone = clean(req.body.phone, 30)
    if (phone !== undefined) updates.phone = phone || null
    const address = clean(req.body.address, 200)
    if (address !== undefined) updates.address = address || null
    const footer = clean(req.body.receipt_footer, 300)
    if (footer !== undefined) updates.receipt_footer = footer || null

    if (Object.keys(updates).length === 0) return error(res, 'Nothing to update')
    updates.updated_at = new Date().toISOString()

    const { data, error: dbError } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', req.tenantId)
      .select('id, name, slug, phone, address, receipt_footer')
      .single()
    if (dbError) return error(res, 'Could not update business profile', 500)
    return success(res, data, 'Business profile updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router