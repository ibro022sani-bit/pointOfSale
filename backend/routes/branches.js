import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('branches').select('*').order('name', { ascending: true })
    if (dbError) return error(res, 'Could not fetch branches', 500)
    return success(res, data, 'Branches fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, address, phone, is_main } = req.body
    if (!name) return error(res, 'Branch name is required')

    const { data: branch, error: dbError } = await supabase
      .from('branches').insert({ name, address: address || null, phone: phone || null, is_main: !!is_main }).select().single()

    if (dbError) return error(res, 'Could not create branch', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create', entity_type: 'branch', entity_id: branch.id, new_value: branch })
    return success(res, branch, 'Branch created')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('branches').select('*').eq('id', req.params.id).single()
    if (dbError || !data) return error(res, 'Branch not found', 404)
    return success(res, data, 'Branch fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('branches').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Branch not found', 404)

    const { name, address, phone, is_main, is_active } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (address !== undefined) updates.address = address
    if (phone !== undefined) updates.phone = phone
    if (is_main !== undefined) updates.is_main = is_main
    if (is_active !== undefined) updates.is_active = is_active

    const { data: updated, error: dbError } = await supabase.from('branches').update(updates).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not update branch', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'update', entity_type: 'branch', entity_id: id, old_value: existing, new_value: updated })
    return success(res, updated, 'Branch updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('branches').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Branch not found', 404)

    const { data: updated, error: dbError } = await supabase.from('branches').update({ is_active: false }).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not delete branch', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'delete', entity_type: 'branch', entity_id: id, old_value: existing })
    return success(res, updated, 'Branch deactivated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/:id/products', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const branch_id = req.params.id
    if (req.user.role !== 'super_admin' && branch_id !== req.user.branch_id) {
      return error(res, 'Unauthorized', 403)
    }
    const { product_id, initial_stock, low_stock_threshold, cost_price, supplier_id } = req.body
    if (!product_id) return error(res, 'product_id is required')

    const { data: branch } = await supabase.from('branches').select('id').eq('id', branch_id).single()
    if (!branch) return error(res, 'Branch not found', 404)

    const { data: product } = await supabase.from('products').select('id').eq('id', product_id).single()
    if (!product) return error(res, 'Product not found', 404)

    const { data, error: dbError } = await supabase
      .from('branch_products')
      .upsert({ branch_id, product_id, is_active: true }, { onConflict: 'branch_id,product_id' })
      .select()
      .single()

    if (dbError) return error(res, 'Could not link product to branch', 500)

    const quantity = initial_stock !== undefined ? initial_stock : 0

    const { data: stock } = await supabase
      .from('stock')
      .upsert({
        branch_id,
        product_id,
        quantity,
        low_stock_threshold: low_stock_threshold !== undefined ? low_stock_threshold : 5
      }, { onConflict: 'branch_id,product_id' })
      .select()
      .single()

    let receipt = null
    if (cost_price !== undefined && quantity > 0) {
      const { data: receiptRow, error: receiptErr } = await supabase
        .from('stock_receipts')
        .insert({
          branch_id,
          supplier_id: supplier_id || null,
          received_by: req.user.id,
          total_cost: quantity * cost_price,
          notes: 'Initial stock on branch assignment'
        })
        .select().single()

      if (!receiptErr) {
        await supabase.from('stock_receipt_items').insert({
          stock_receipt_id: receiptRow.id, product_id, quantity, cost_price
        })
        receipt = receiptRow
      }
    }

    return success(res, { ...data, stock, receipt }, 'Product added to branch')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/:id/products/:productId', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id: branch_id, productId: product_id } = req.params
    if (req.user.role !== 'super_admin' && branch_id !== req.user.branch_id) {
      return error(res, 'Unauthorized', 403)
    }
    const { error: dbError } = await supabase.from('branch_products').update({ is_active: false }).eq('branch_id', branch_id).eq('product_id', product_id)
    if (dbError) return error(res, 'Could not remove product from branch', 500)
    return success(res, {}, 'Product removed from branch')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router