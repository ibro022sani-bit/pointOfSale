import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)

router.post('/:id/deposit/add', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { amount, payment_method, reference, branch_id } = req.body
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')
    if (!payment_method) return error(res, 'payment_method is required')

const effectiveBranchId = req.user.role === 'super_admin' ? (branch_id || null) : req.user.branch_id

    const { data: customer } = await supabase.from('customers').select('id').eq('id', customer_id).single()
    if (!customer) return error(res, 'Customer not found', 404)

    let { data: account } = await supabase.from('deposit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()

    if (!account) {
      const { data: newAccount, error: openErr } = await supabase
        .from('deposit_accounts')
        .insert({ customer_id, current_balance: 0, opened_by: req.user.id })
        .select().single()
      if (openErr) return error(res, 'Could not open deposit account', 500)
      account = newAccount
    }

    const newBalance = Number(account.current_balance) + Number(amount)

    const { data: updated, error: dbError } = await supabase
      .from('deposit_accounts').update({ current_balance: newBalance }).eq('id', account.id).select().single()

    if (dbError) return error(res, 'Could not update deposit balance', 500)

    await supabase.from('deposit_transactions').insert({
      deposit_account_id: account.id, type: 'deposit_in', amount, payment_method, reference: reference || null,
      confirmed_by: req.user.id, balance_after: newBalance, branch_id: effectiveBranchId
    })

    await supabase.from('audit_logs').insert({
      user_id: req.user.id, action: 'deposit_add', entity_type: 'deposit_account', entity_id: account.id, new_value: { amount, newBalance }
    })

    return success(res, updated, 'Deposit added')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/:id/deposit/transactions', async (req, res) => {
  try {
    const { id: customer_id } = req.params

    const isSelf = req.user.role === 'customer' && req.user.id === customer_id
    const isStaff = ['super_admin', 'admin', 'cashier'].includes(req.user.role)
    if (!isSelf && !isStaff) return error(res, 'Unauthorized', 403)

    const { data: account } = await supabase.from('deposit_accounts').select('id').eq('customer_id', customer_id).maybeSingle()
    if (!account) return success(res, [], 'No deposit account exists yet')

    const { data, error: dbError } = await supabase
      .from('deposit_transactions')
      .select('id, type, amount, note, sale_id, balance_after, created_at, users:confirmed_by(name)')
      .eq('deposit_account_id', account.id)
      .order('created_at', { ascending: false })

    if (dbError) return error(res, 'Could not fetch deposit transactions', 500)

    const shaped = data.map(({ users, ...rest }) => ({ ...rest, staff_name: users?.name || null }))
    return success(res, shaped, 'Deposit transactions fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/:id/deposit/adjust', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { amount, note, branch_id } = req.body
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')
    const effectiveBranchId = req.user.role === 'super_admin' ? (branch_id || null) : req.user.branch_id

    const { data: customer } = await supabase.from('customers').select('id').eq('id', customer_id).single()
    if (!customer) return error(res, 'Customer not found', 404)

    let { data: account } = await supabase.from('deposit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()

    if (!account) {
      const { data: newAccount, error: openErr } = await supabase
        .from('deposit_accounts')
        .insert({ customer_id, current_balance: 0, opened_by: req.user.id })
        .select().single()
      if (openErr) return error(res, 'Could not open deposit account', 500)
      account = newAccount
    }

    const newBalance = Number(account.current_balance) + Number(amount)

    const { data: updated, error: dbError } = await supabase
      .from('deposit_accounts').update({ current_balance: newBalance }).eq('id', account.id).select().single()

    if (dbError) return error(res, 'Could not adjust balance', 500)

    await supabase.from('deposit_transactions').insert({
      deposit_account_id: account.id, type: 'deposit_in', amount, note: note || null,
      confirmed_by: req.user.id, balance_after: newBalance, branch_id: effectiveBranchId
    })

    await supabase.from('audit_logs').insert({
      user_id: req.user.id, action: 'manual_deposit_adjustment', entity_type: 'deposit_account', entity_id: account.id, new_value: { amount, note: note || null, newBalance }
    })

    return success(res, updated, 'Manual deposit entry recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router