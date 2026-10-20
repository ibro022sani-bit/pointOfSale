import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('super_admin', 'admin', 'cashier'))

router.get('/branch/:branchId', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin' && req.params.branchId !== req.user.branch_id) {
      return error(res, 'Unauthorized', 403)
    }

    const { data, error: dbError } = await supabase
      .from('stock')
      .select('*, products(id, name, category, unit_of_measurement, price)')
      .eq('branch_id', req.params.branchId)
      .order('updated_at', { ascending: false })

    if (dbError) return error(res, 'Could not fetch stock', 500)
    return success(res, data, 'Stock fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/branch/:branchId/product/:productId', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { branchId, productId } = req.params
    const { quantity, low_stock_threshold } = req.body

    const { data: existing } = await supabase.from('stock').select('*').eq('branch_id', branchId).eq('product_id', productId).single()
    if (!existing) return error(res, 'Stock record not found for this branch/product', 404)

    const updates = { updated_at: new Date() }
    if (quantity !== undefined) updates.quantity = quantity
    if (low_stock_threshold !== undefined) updates.low_stock_threshold = low_stock_threshold

    const { data: updated, error: dbError } = await supabase
      .from('stock').update(updates).eq('branch_id', branchId).eq('product_id', productId).select().single()

    if (dbError) return error(res, 'Could not update stock', 500)

    await supabase.from('audit_logs').insert({
      user_id: req.user.id, action: 'update', entity_type: 'stock', entity_id: updated.id, old_value: existing, new_value: updated
    })

    return success(res, updated, 'Stock updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/low-stock', async (req, res) => {
  try {
    let { branch } = req.query
    if (req.user.role !== 'super_admin') branch = req.user.branch_id

    let query = supabase.from('stock').select('*, products(id, name, category, unit_of_measurement), branches(id, name)')
    if (branch) query = query.eq('branch_id', branch)

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not fetch stock', 500)

    const lowStock = (data || []).filter(row => Number(row.quantity) <= Number(row.low_stock_threshold))
    return success(res, lowStock, 'Low stock items fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/restock', async (req, res) => {
  try {
    let { branch, from, to, payment_status } = req.query
    if (req.user.role !== 'super_admin') branch = req.user.branch_id
    let query = supabase
      .from('stock_receipts')
      .select('*, branches(name), suppliers(name), users:received_by(name), stock_receipt_items(*, products(name))')
      .order('created_at', { ascending: false })

    if (branch) query = query.eq('branch_id', branch)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)
    if (payment_status) query = query.eq('payment_status', payment_status)

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not fetch restock history', 500)
    return success(res, data, 'Restock history fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/restock', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    let { branch_id, supplier_id, notes, items, amount_paid_now } = req.body

    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id
    if (!branch_id) return error(res, 'branch_id is required')
    if (!Array.isArray(items) || items.length === 0) return error(res, 'items array is required')
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.cost_price === undefined) {
        return error(res, 'Each item needs product_id, quantity and cost_price')
      }
    }

    const total_cost = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.cost_price)), 0)
      const amountPaid = amount_paid_now ? Number(amount_paid_now) : 0
      const paymentStatus = amountPaid >= total_cost ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid')

      const { data: receipt, error: receiptErr } = await supabase
        .from('stock_receipts')
        .insert({ branch_id, supplier_id: supplier_id || null, received_by: req.user.id, total_cost, notes: notes || null, amount_paid: amountPaid, payment_status: paymentStatus })
        .select().single()

      if (amountPaid > 0 && !receiptErr) {
        await supabase.from('stock_receipt_payments').insert({
          stock_receipt_id: receipt.id, amount: amountPaid, payment_method: 'cash', paid_by: req.user.id
        })
      }

    if (receiptErr) return error(res, 'Could not create stock receipt', 500)

    const itemRows = items.map(i => ({ stock_receipt_id: receipt.id, product_id: i.product_id, quantity: i.quantity, cost_price: i.cost_price }))
    const { error: itemsErr } = await supabase.from('stock_receipt_items').insert(itemRows)
    if (itemsErr) return error(res, 'Could not save receipt items', 500)

    for (const item of items) {
      const { data: existingStock } = await supabase.from('stock').select('*').eq('branch_id', branch_id).eq('product_id', item.product_id).maybeSingle()

      if (existingStock) {
        await supabase.from('stock').update({ quantity: Number(existingStock.quantity) + Number(item.quantity), updated_at: new Date() }).eq('id', existingStock.id)
      } else {
        await supabase.from('stock').insert({ branch_id, product_id: item.product_id, quantity: item.quantity })
      }

      await supabase.from('branch_products').upsert({ branch_id, product_id: item.product_id, is_active: true }, { onConflict: 'branch_id,product_id' })
    }

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create', entity_type: 'stock_receipt', entity_id: receipt.id, new_value: receipt })
    return success(res, { ...receipt, items }, 'Stock received and updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/restock/:id/pay', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { amount, payment_method, reference } = req.body
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')
    if (!payment_method) return error(res, 'payment_method is required')

    const { data: receiptRow } = await supabase.from('stock_receipts').select('*').eq('id', id).single()
    if (!receiptRow) return error(res, 'Stock receipt not found', 404)

    const outstanding = Number(receiptRow.total_cost) - Number(receiptRow.amount_paid)
    if (Number(amount) > outstanding) return error(res, 'Amount exceeds the outstanding balance for this restock')

    const newAmountPaid = Number(receiptRow.amount_paid) + Number(amount)
    const newStatus = newAmountPaid >= Number(receiptRow.total_cost) ? 'paid' : 'partial'

    const { data: updated, error: dbError } = await supabase
      .from('stock_receipts')
      .update({ amount_paid: newAmountPaid, payment_status: newStatus })
      .eq('id', id).select().single()

    if (dbError) return error(res, 'Could not record payment', 500)

    await supabase.from('stock_receipt_payments').insert({
      stock_receipt_id: id, amount, payment_method, reference: reference || null, paid_by: req.user.id
    })

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'pay_supplier', entity_type: 'stock_receipt', entity_id: id, new_value: { amount, newAmountPaid } })

    return success(res, updated, 'Supplier payment recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.put('/restock/:id/items/:itemId', requireRole('super_admin'), async (req, res) => {
  try {
    const { id, itemId } = req.params
    const { quantity, cost_price } = req.body

    if (quantity === undefined && cost_price === undefined) {
      return error(res, 'Provide a new quantity and/or cost_price to correct')
    }
    if (quantity !== undefined && Number(quantity) <= 0) return error(res, 'quantity must be greater than 0')
    if (cost_price !== undefined && Number(cost_price) < 0) return error(res, 'cost_price cannot be negative')

    const { data: item } = await supabase.from('stock_receipt_items').select('*').eq('id', itemId).eq('stock_receipt_id', id).single()
    if (!item) return error(res, 'Restock item not found', 404)

    const { data: receipt } = await supabase.from('stock_receipts').select('*').eq('id', id).single()
    if (!receipt) return error(res, 'Stock receipt not found', 404)

    const newQuantity = quantity !== undefined ? Number(quantity) : Number(item.quantity)
    const newCostPrice = cost_price !== undefined ? Number(cost_price) : Number(item.cost_price)
    const quantityDelta = newQuantity - Number(item.quantity)

    if (quantityDelta !== 0 && receipt.branch_id) {
      const { data: stockRow } = await supabase.from('stock').select('*').eq('branch_id', receipt.branch_id).eq('product_id', item.product_id).maybeSingle()
      const currentQty = Number(stockRow?.quantity || 0)
      const adjustedQty = currentQty + quantityDelta

      if (adjustedQty < 0) {
        return error(res, `Can't apply this correction — it would take stock on hand negative (currently ${currentQty}, this needs to remove ${-quantityDelta}). Some of the extra units may already be sold; reconcile stock manually first.`)
      }

      if (stockRow) {
        await supabase.from('stock').update({ quantity: adjustedQty, updated_at: new Date() }).eq('id', stockRow.id)
      }
    }

    const { data: updatedItem, error: itemErr } = await supabase
      .from('stock_receipt_items')
      .update({ quantity: newQuantity, cost_price: newCostPrice })
      .eq('id', itemId).select().single()

    if (itemErr) return error(res, 'Could not update restock item', 500)

    const { data: allItems } = await supabase.from('stock_receipt_items').select('quantity, cost_price').eq('stock_receipt_id', id)
    const newTotalCost = (allItems || []).reduce((sum, i) => sum + Number(i.quantity) * Number(i.cost_price), 0)
    const newPaymentStatus = Number(receipt.amount_paid) >= newTotalCost
      ? 'paid'
      : (Number(receipt.amount_paid) > 0 ? 'partial' : 'unpaid')

    const { data: updatedReceipt, error: receiptErr } = await supabase
      .from('stock_receipts')
      .update({ total_cost: newTotalCost, payment_status: newPaymentStatus })
      .eq('id', id).select().single()

    if (receiptErr) return error(res, 'Could not update receipt total', 500)

    await supabase.from('audit_logs').insert({
      user_id: req.user.id, action: 'correct_restock_item', entity_type: 'stock_receipt_item', entity_id: itemId,
      old_value: item, new_value: updatedItem
    })

    const overpaid = Number(receipt.amount_paid) > newTotalCost
    return success(res, {
      item: updatedItem,
      receipt: updatedReceipt,
      warning: overpaid ? `Amount already paid (₦${receipt.amount_paid}) now exceeds the corrected total (₦${newTotalCost}) — the supplier may be owed a refund or credit.` : null
    }, 'Restock item corrected')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/restock/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: receipt, error: dbError } = await supabase
      .from('stock_receipts')
      .select('*, branches(name), suppliers(name), users:received_by(name), stock_receipt_items(*, products(name)))')
      .eq('id', id).single()

    if (dbError || !receipt) return error(res, 'Stock receipt not found', 404)

    if (req.user.role !== 'super_admin' && receipt.branch_id !== req.user.branch_id) {
      return error(res, 'Unauthorized', 403)
    }

    const { data: payments } = await supabase
      .from('stock_receipt_payments')
      .select('*, users:paid_by(name)')
      .eq('stock_receipt_id', id)
      .order('created_at', { ascending: false })

    return success(res, { ...receipt, payments: payments || [] }, 'Stock receipt fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.post('/restock/opening-balance', requireRole('super_admin'), async (req, res) => {
  try {
    const { supplier_id, total_cost, amount_paid_now, notes } = req.body
    if (!supplier_id) return error(res, 'supplier_id is required')
    if (!total_cost || total_cost <= 0) return error(res, 'A valid total_cost is required')

    const { data: supplier } = await supabase.from('suppliers').select('id').eq('id', supplier_id).single()
    if (!supplier) return error(res, 'Supplier not found', 404)

    const amountPaid = amount_paid_now ? Number(amount_paid_now) : 0
    const paymentStatus = amountPaid >= total_cost ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid')

    const { data: receipt, error: receiptErr } = await supabase
      .from('stock_receipts')
      .insert({
        branch_id: null, supplier_id, received_by: req.user.id, total_cost,
        notes: notes || 'Opening balance (pre-system debt)', amount_paid: amountPaid, payment_status: paymentStatus
      })
      .select().single()

    if (receiptErr) return error(res, 'Could not record opening balance', 500)

    if (amountPaid > 0) {
      await supabase.from('stock_receipt_payments').insert({
        stock_receipt_id: receipt.id, amount: amountPaid, payment_method: 'cash', paid_by: req.user.id
      })
    }

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create_opening_balance', entity_type: 'stock_receipt', entity_id: receipt.id, new_value: receipt })

    return success(res, receipt, 'Opening balance recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/transfer', async (req, res) => {
  try {
    const { status } = req.query
    let query = supabase
      .from('stock_transfers')
      .select('*, from:from_branch_id(name), to:to_branch_id(name), stock_transfer_items(*, products(name)))')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    if (req.user.role !== 'super_admin') {
      query = query.or(`from_branch_id.eq.${req.user.branch_id},to_branch_id.eq.${req.user.branch_id}`)
    }

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not fetch transfers', 500)
    return success(res, data, 'Transfers fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/transfer', async (req, res) => {
  try {
    let { from_branch_id, to_branch_id, notes, items } = req.body

    if (req.user.role !== 'super_admin') from_branch_id = req.user.branch_id
    if (!from_branch_id || !to_branch_id) return error(res, 'from_branch_id and to_branch_id are required')
    if (from_branch_id === to_branch_id) return error(res, 'from_branch_id and to_branch_id must differ')
    if (!Array.isArray(items) || items.length === 0) return error(res, 'items array is required')

    for (const item of items) {
      const { data: stockRow } = await supabase.from('stock').select('quantity').eq('branch_id', from_branch_id).eq('product_id', item.product_id).single()
      if (!stockRow || Number(stockRow.quantity) < Number(item.quantity)) {
        return error(res, `Insufficient stock for product ${item.product_id} at source branch`)
      }
    }

    const { data: transfer, error: transferErr } = await supabase
      .from('stock_transfers').insert({ from_branch_id, to_branch_id, initiated_by: req.user.id, notes: notes || null }).select().single()

    if (transferErr) return error(res, 'Could not create transfer', 500)

    const itemRows = items.map(i => ({ transfer_id: transfer.id, product_id: i.product_id, quantity: i.quantity }))
    await supabase.from('stock_transfer_items').insert(itemRows)

    for (const item of items) {
      const { data: stockRow } = await supabase.from('stock').select('*').eq('branch_id', from_branch_id).eq('product_id', item.product_id).single()
      await supabase.from('stock').update({ quantity: Number(stockRow.quantity) - Number(item.quantity), updated_at: new Date() }).eq('id', stockRow.id)
    }

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create', entity_type: 'stock_transfer', entity_id: transfer.id, new_value: transfer })
    return success(res, { ...transfer, items }, 'Transfer created, stock reserved from source branch')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/transfer/:id/approve', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: transfer } = await supabase.from('stock_transfers').select('*').eq('id', id).single()
    if (!transfer) return error(res, 'Transfer not found', 404)
    if (transfer.status !== 'pending') return error(res, `Transfer is already ${transfer.status}`)

    const { data: updated, error: dbError } = await supabase
      .from('stock_transfers').update({ status: 'approved', approved_by: req.user.id }).eq('id', id).select().single()

    if (dbError) return error(res, 'Could not approve transfer', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'approve', entity_type: 'stock_transfer', entity_id: id, old_value: transfer, new_value: updated })
    return success(res, updated, 'Transfer approved')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/transfer/:id/receive', async (req, res) => {
  try {
    const { id } = req.params
    const { data: transfer } = await supabase.from('stock_transfers').select('*, stock_transfer_items(*)').eq('id', id).single()

    if (!transfer) return error(res, 'Transfer not found', 404)
    if (transfer.status !== 'approved') return error(res, 'Transfer must be approved before it can be received')

    for (const item of transfer.stock_transfer_items) {
      const { data: existingStock } = await supabase.from('stock').select('*').eq('branch_id', transfer.to_branch_id).eq('product_id', item.product_id).maybeSingle()

      if (existingStock) {
        await supabase.from('stock').update({ quantity: Number(existingStock.quantity) + Number(item.quantity), updated_at: new Date() }).eq('id', existingStock.id)
      } else {
        await supabase.from('stock').insert({ branch_id: transfer.to_branch_id, product_id: item.product_id, quantity: item.quantity })
      }

      await supabase.from('branch_products').upsert({ branch_id: transfer.to_branch_id, product_id: item.product_id, is_active: true }, { onConflict: 'branch_id,product_id' })
    }

    const { data: updated, error: dbError } = await supabase.from('stock_transfers').update({ status: 'received' }).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not mark transfer as received', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'receive', entity_type: 'stock_transfer', entity_id: id, old_value: transfer, new_value: updated })
    return success(res, updated, 'Transfer received, stock updated at destination branch')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router