import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('super_admin', 'admin', 'cashier'))

router.get('/', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('suppliers').select('*').order('name', { ascending: true })
    if (dbError) return error(res, 'Could not fetch suppliers', 500)
    return success(res, data, 'Suppliers fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, phone, email, address } = req.body
    if (!name) return error(res, 'Supplier name is required')

    const { data: supplier, error: dbError } = await supabase
      .from('suppliers').insert({ name, phone: phone || null, email: email || null, address: address || null }).select().single()

    if (dbError) return error(res, 'Could not create supplier', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create', entity_type: 'supplier', entity_id: supplier.id, new_value: supplier })
    return success(res, supplier, 'Supplier created')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('suppliers').select('*').eq('id', req.params.id).single()
    if (dbError || !data) return error(res, 'Supplier not found', 404)
    return success(res, data, 'Supplier fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('suppliers').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Supplier not found', 404)

    const allowed = ['name', 'phone', 'email', 'address']
    const updates = {}
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]

    const { data: updated, error: dbError } = await supabase.from('suppliers').update(updates).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not update supplier', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'update', entity_type: 'supplier', entity_id: id, old_value: existing, new_value: updated })
    return success(res, updated, 'Supplier updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('suppliers').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Supplier not found', 404)

    const { error: dbError } = await supabase.from('suppliers').delete().eq('id', id)
    if (dbError) return error(res, 'Could not delete supplier — they may have existing stock receipts linked', 400)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'delete', entity_type: 'supplier', entity_id: id, old_value: existing })
    return success(res, {}, 'Supplier deleted')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router