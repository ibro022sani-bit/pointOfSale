import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('super_admin', 'admin', 'cashier'))

router.post('/', async (req, res) => {
  try {
    let { branch_id } = req.body
    if (!branch_id) return error(res, 'branch_id is required')
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    const { data: existingOpen } = await supabase
      .from('loose_sale_carts').select('id').eq('branch_id', branch_id).eq('status', 'open').maybeSingle()

    if (existingOpen) return error(res, 'This branch already has an open cart — close it before opening a new one')

    const { data: cart, error: dbError } = await supabase
      .from('loose_sale_carts')
      .insert({ cashier_id: req.user.id, branch_id, status: 'open' })
      .select().single()

    if (dbError) return error(res, 'Could not open cart', 500)
    return success(res, cart, 'Cart opened')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/active', async (req, res) => {
  try {
    const { branch } = req.query
    let query = supabase
      .from('loose_sale_carts')
      .select('*, cart_items(*, products(name, unit_of_measurement)), users:cashier_id(name)')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })

    if (branch) query = query.eq('branch_id', branch)

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not fetch active carts', 500)
    return success(res, data, 'Active carts fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/open', async (req, res) => {
  try {
    const { branch_id } = req.query
    if (!branch_id) return error(res, 'branch_id is required')

    const { data, error: dbError } = await supabase
      .from('loose_sale_carts')
      .select('*, cart_items(*, products(name, unit_of_measurement)), users:cashier_id(name)')
      .eq('branch_id', branch_id)
      .eq('status', 'open')
      .maybeSingle()

    if (dbError) return error(res, 'Could not check for open cart', 500)
    return success(res, data, data ? 'Open cart found' : 'No open cart for this branch')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/:id', async (req, res) => {
  try {
    const { data: cart, error: dbError } = await supabase
      .from('loose_sale_carts')
      .select('*, cart_items(*, products(name, unit_of_measurement)), users:cashier_id(name)')
      .eq('id', req.params.id).single()

    if (dbError || !cart) return error(res, 'Cart not found', 404)
    return success(res, cart, 'Cart fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/:id/items', async (req, res) => {
  try {
    const { id: cart_id } = req.params
    const { product_id, initial_quantity, unit_price, offline_id } = req.body

    if (!product_id || !initial_quantity || unit_price === undefined) {
      return error(res, 'product_id, initial_quantity and unit_price are required')
    }

    if (offline_id) {
      const { data: existingItem } = await supabase.from('cart_items').select('*').eq('offline_id', offline_id).maybeSingle()
      if (existingItem) return success(res, existingItem, 'Item already added to cart')
    }

    const { data: cart } = await supabase.from('loose_sale_carts').select('*').eq('id', cart_id).single()
    if (!cart) return error(res, 'Cart not found', 404)
    if (cart.status !== 'open') return error(res, 'Cart is closed')

    const { data: stockRow } = await supabase.from('stock').select('*').eq('branch_id', cart.branch_id).eq('product_id', product_id).single()
    if (!stockRow || Number(stockRow.quantity) < Number(initial_quantity)) {
      return error(res, 'Insufficient stock for this product')
    }

    const { data: item, error: itemErr } = await supabase
      .from('cart_items')
      .insert({ cart_id, product_id, initial_quantity, remaining_quantity: initial_quantity, unit_price, offline_id: offline_id || null })
      .select().single()

    if (itemErr) {
      if (itemErr.code === '23505') return error(res, 'This item was already added (duplicate offline_id)')
      return error(res, 'Could not add item to cart', 500)
    }

    await supabase.from('stock').update({ quantity: Number(stockRow.quantity) - Number(initial_quantity), updated_at: new Date() }).eq('id', stockRow.id)

    return success(res, item, 'Item added to cart, stock reserved')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { id: cart_id, itemId } = req.params
    const { remaining_quantity } = req.body
    if (remaining_quantity === undefined) return error(res, 'remaining_quantity is required')

    const { data: cart } = await supabase.from('loose_sale_carts').select('status').eq('id', cart_id).single()
    if (!cart) return error(res, 'Cart not found', 404)
    if (cart.status !== 'open') return error(res, 'Cart is closed')

    const { data: item } = await supabase.from('cart_items').select('*').eq('id', itemId).eq('cart_id', cart_id).single()
    if (!item) return error(res, 'Cart item not found', 404)
    if (Number(remaining_quantity) < 0 || Number(remaining_quantity) > Number(item.initial_quantity)) {
      return error(res, 'remaining_quantity must be between 0 and the initial quantity')
    }

    const { data: updated, error: dbError } = await supabase.from('cart_items').update({ remaining_quantity }).eq('id', itemId).select().single()
    if (dbError) return error(res, 'Could not update item', 500)

    return success(res, updated, 'Cart item updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const { id: cart_id, itemId } = req.params

    const { data: cart } = await supabase.from('loose_sale_carts').select('branch_id, status').eq('id', cart_id).single()
    if (!cart) return error(res, 'Cart not found', 404)
    if (cart.status !== 'open') return error(res, 'Cart is closed')

    const { data: item } = await supabase.from('cart_items').select('*').eq('id', itemId).eq('cart_id', cart_id).single()
    if (!item) return error(res, 'Cart item not found', 404)

    const { data: stockRow } = await supabase.from('stock').select('*').eq('branch_id', cart.branch_id).eq('product_id', item.product_id).maybeSingle()
    if (stockRow) {
      await supabase.from('stock').update({ quantity: Number(stockRow.quantity) + Number(item.initial_quantity), updated_at: new Date() }).eq('id', stockRow.id)
    }

    await supabase.from('cart_items').delete().eq('id', itemId)
    return success(res, {}, 'Item removed from cart, stock restored')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/close', async (req, res) => {
  try {
    const { id: cart_id } = req.params
    const { payment_method, customer_id, items } = req.body

    const { data: cart } = await supabase.from('loose_sale_carts').select('*, cart_items(*)').eq('id', cart_id).single()
    if (!cart) return error(res, 'Cart not found', 404)
    if (cart.status !== 'open') {
      if (cart.sale_id) {
        const { data: existingSale } = await supabase.from('sales').select('*').eq('id', cart.sale_id).single()
        return success(res, { cart, sale: existingSale }, 'Cart was already closed')
      }
      return error(res, 'Cart is already closed')
    }
    if (cart.cart_items.length === 0) return error(res, 'Cannot close an empty cart')

    if (Array.isArray(items) && items.length > 0) {
      for (const update of items) {
        if (!update.cart_item_id || update.remaining_quantity === undefined) {
          return error(res, 'Each item needs cart_item_id and remaining_quantity')
        }
        const matching = cart.cart_items.find(ci => ci.id === update.cart_item_id)
        if (!matching) return error(res, `cart_item_id ${update.cart_item_id} does not belong to this cart`)
        if (Number(update.remaining_quantity) < 0 || Number(update.remaining_quantity) > Number(matching.initial_quantity)) {
          return error(res, `remaining_quantity for ${update.cart_item_id} must be between 0 and its initial quantity`)
        }
      }

      for (const update of items) {
        await supabase.from('cart_items').update({ remaining_quantity: update.remaining_quantity }).eq('id', update.cart_item_id)
        const target = cart.cart_items.find(ci => ci.id === update.cart_item_id)
        target.remaining_quantity = update.remaining_quantity
      }
    }

    const soldItems = cart.cart_items
      .map(item => ({ ...item, sold: Number(item.initial_quantity) - Number(item.remaining_quantity) }))
      .filter(item => item.sold > 0)

    if (soldItems.length === 0) {
      for (const item of cart.cart_items) {
        const { data: stockRow } = await supabase.from('stock').select('*').eq('branch_id', cart.branch_id).eq('product_id', item.product_id).maybeSingle()
        if (stockRow) {
          await supabase.from('stock').update({ quantity: Number(stockRow.quantity) + Number(item.remaining_quantity), updated_at: new Date() }).eq('id', stockRow.id)
        }
      }

      const { data: closedCart, error: closeErr } = await supabase
        .from('loose_sale_carts').update({ status: 'closed', closed_at: new Date(), sale_id: null }).eq('id', cart_id).select().single()

      if (closeErr) return error(res, 'Could not close cart', 500)

      await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'close_empty', entity_type: 'loose_sale_cart', entity_id: cart_id, new_value: closedCart })

      return success(res, { cart: closedCart, sale: null }, 'Cart closed — nothing was sold, all stock returned')
    }

    if (!payment_method) return error(res, 'payment_method is required')

    const total_amount = soldItems.reduce((sum, i) => sum + (i.sold * Number(i.unit_price)), 0)

    if (payment_method === 'credit' && !customer_id) return error(res, 'customer_id is required for credit')

    let creditAccount = null
    if (payment_method === 'credit') {
      const { data: account } = await supabase.from('credit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()
      if (!account) return error(res, 'Customer has no credit account')
      if (account.status !== 'active') return error(res, 'Customer credit account is suspended')
      if (Number(account.current_balance) + total_amount > Number(account.credit_limit)) {
        return error(res, 'This sale would exceed the customer\'s credit limit')
      }
      creditAccount = account
    }

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        branch_id: cart.branch_id,
        cashier_id: req.user.id,
        customer_id: customer_id || null,
        payment_method,
        total_amount,
        amount_paid: payment_method === 'credit' ? total_amount : null,
        payment_status: payment_method === 'credit' ? 'paid' : 'pending',
        status: 'completed',
        sale_type: 'cart_closure'
      })
      .select().single()

    if (saleErr) return error(res, 'Could not create sale from cart', 500)

    const itemRows = soldItems.map(i => ({
      sale_id: sale.id, product_id: i.product_id, quantity: i.sold, unit_price: i.unit_price, subtotal: i.sold * i.unit_price
    }))
    await supabase.from('sale_items').insert(itemRows)

    for (const item of cart.cart_items) {
      const remaining = Number(item.remaining_quantity)
      if (remaining > 0) {
        const { data: stockRow } = await supabase.from('stock').select('*').eq('branch_id', cart.branch_id).eq('product_id', item.product_id).maybeSingle()
        if (stockRow) {
          await supabase.from('stock').update({ quantity: Number(stockRow.quantity) + remaining, updated_at: new Date() }).eq('id', stockRow.id)
        }
      }
    }

    if (payment_method === 'credit' && creditAccount) {
      const newBalance = Number(creditAccount.current_balance) + total_amount
      await supabase.from('credit_accounts').update({ current_balance: newBalance }).eq('id', creditAccount.id)
      await supabase.from('credit_transactions').insert({
        credit_account_id: creditAccount.id, type: 'debit', amount: total_amount, sale_id: sale.id, balance_after: newBalance
      })
    }

    const { data: updatedCart, error: cartErr } = await supabase
      .from('loose_sale_carts').update({ status: 'closed', closed_at: new Date(), sale_id: sale.id }).eq('id', cart_id).select().single()

    if (cartErr) return error(res, 'Could not close cart', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'close', entity_type: 'loose_sale_cart', entity_id: cart_id, new_value: updatedCart })

    return success(res, { cart: updatedCart, sale }, 'Cart closed, sale created, unsold stock returned')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router