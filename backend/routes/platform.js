import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requirePlatformAdmin, clearTenantStatusCache } from '../lib/middleware.js'

const router = express.Router()
router.use(requirePlatformAdmin)

router.get('/tenants', async (req, res) => {
  try {
    const { data: tenants, error: dbError } = await supabase
      .from('tenants').select('*').order('created_at', { ascending: false })
    if (dbError) return error(res, 'Could not fetch businesses', 500)

    const { data: owners } = await supabase
      .from('users').select('tenant_id, name, email, phone, created_at')
      .eq('role', 'super_admin').order('created_at', { ascending: true })

    const ownerByTenant = {}
    for (const o of owners || []) {
      if (!ownerByTenant[o.tenant_id]) ownerByTenant[o.tenant_id] = o
    }

    return success(res, tenants.map((t) => ({ ...t, owner: ownerByTenant[t.id] || null })), 'Businesses fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// Activate / deactivate a business and/or update its "paid until" date and note
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, paid_until, note } = req.body

    const updates = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      if (!['active', 'suspended'].includes(status)) return error(res, 'status must be active or suspended')
      updates.status = status
      if (status === 'active') updates.activated_at = new Date().toISOString()
    }
    if (paid_until !== undefined) {
      if (paid_until && isNaN(new Date(paid_until).getTime())) return error(res, 'Invalid paid_until date')
      updates.paid_until = paid_until || null
    }
    if (note !== undefined) updates.status_note = note || null

    const { data, error: dbError } = await supabase
      .from('tenants').update(updates).eq('id', id).select().single()
    if (dbError || !data) return error(res, 'Business not found', 404)

    clearTenantStatusCache(id)

    await supabase.from('audit_logs').insert({
      tenant_id: id, user_id: req.user.id, action: status || 'update',
      entity_type: 'tenant', entity_id: id, new_value: updates
    })

    return success(res, data, 'Business updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router