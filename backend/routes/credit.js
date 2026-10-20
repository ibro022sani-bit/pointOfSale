import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)

router.get('/:id/credit', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('credit_accounts').select('*').eq('customer_id', req.params.id).maybeSingle()
    if (dbError) return error(res, 'Could not fetch credit account', 500)
    return success(res, data, data ? 'Credit account fetched' : 'No credit account exists yet')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/credit/limit', requireRole('super_admin'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { credit_limit } = req.body
    if (credit_limit === undefined || credit_limit < 0) return error(res, 'A valid credit_limit is required')

    const { data: customer } = await supabase.from('customers').select('id').eq('id', customer_id).single()
    if (!customer) return error(res, 'Customer not found', 404)

    const { data: existingAccount } = await supabase.from('credit_accounts').select('id').eq('customer_id', customer_id).maybeSingle()

    const { data: account, error: dbError } = await supabase
      .from('credit_accounts')
      .upsert({
        customer_id,
        credit_limit,
        ...(existingAccount ? {} : { opened_by: req.user.id })
      }, { onConflict: 'customer_id' })
      .select().single()

    if (dbError) return error(res, 'Could not set credit limit', 500)

    await supabase.from('customers').update({ credit_limit, credit_status: account.status }).eq('id', customer_id)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'update_credit_limit', entity_type: 'credit_account', entity_id: account.id, new_value: account })

    return success(res, account, 'Credit limit set')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/credit/activate', requireRole('super_admin'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { data: account } = await supabase.from('credit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()
    if (!account) return error(res, 'This customer has no credit account yet — set a credit limit first')

    const { data: updated, error: dbError } = await supabase.from('credit_accounts').update({ status: 'active' }).eq('id', account.id).select().single()
    if (dbError) return error(res, 'Could not activate credit account', 500)

    await supabase.from('customers').update({ credit_status: 'active' }).eq('id', customer_id)
    return success(res, updated, 'Credit account activated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/credit/suspend', requireRole('super_admin'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { data: account } = await supabase.from('credit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()
    if (!account) return error(res, 'This customer has no credit account')

    const { data: updated, error: dbError } = await supabase.from('credit_accounts').update({ status: 'suspended' }).eq('id', account.id).select().single()
    if (dbError) return error(res, 'Could not suspend credit account', 500)

    await supabase.from('customers').update({ credit_status: 'suspended' }).eq('id', customer_id)
    return success(res, updated, 'Credit account suspended')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id/credit/transactions', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { data: account } = await supabase.from('credit_accounts').select('id').eq('customer_id', customer_id).maybeSingle()
    if (!account) return success(res, [], 'No credit account exists yet')

    const { data, error: dbError } = await supabase
      .from('credit_transactions').select('*').eq('credit_account_id', account.id).order('created_at', { ascending: false })

    if (dbError) return error(res, 'Could not fetch credit transactions', 500)
    return success(res, data, 'Credit transactions fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/:id/credit/repay', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { amount, payment_method, reference, offline_id, branch_id } = req.body
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')
    if (!payment_method) return error(res, 'payment_method is required')

    const effectiveBranchId = req.user.role === 'super_admin' ? (branch_id || null) : req.user.branch_id

    if (offline_id) {
      const { data: existingPayment } = await supabase.from('payments').select('*').eq('offline_id', offline_id).maybeSingle()
      if (existingPayment) {
        const { data: account } = await supabase.from('credit_accounts').select('current_balance').eq('customer_id', customer_id).maybeSingle()
        return success(res, { payment: existingPayment, new_balance: account?.current_balance }, 'Repayment already recorded')
      }
    }

    const { data: account } = await supabase.from('credit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()
    if (!account) return error(res, 'This customer has no credit account')
    if (Number(amount) > Number(account.current_balance)) return error(res, 'Amount exceeds the outstanding balance')

    const newBalance = Number(account.current_balance) - Number(amount)

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({ credit_account_id: account.id, amount, payment_method, reference: reference || null, confirmed_by: req.user.id, offline_id: offline_id || null, branch_id: effectiveBranchId })
      .select().single()

    if (payErr) {
      if (payErr.code === '23505') return error(res, 'This repayment was already recorded (duplicate offline_id)')
      return error(res, 'Could not record payment', 500)
    }

    await supabase.from('credit_accounts').update({ current_balance: newBalance }).eq('id', account.id)
    await supabase.from('credit_transactions').insert({
      credit_account_id: account.id, type: 'credit', amount, payment_id: payment.id, balance_after: newBalance
    })

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'repay', entity_type: 'credit_account', entity_id: account.id, new_value: { amount, newBalance } })

    return success(res, { payment, new_balance: newBalance }, 'Repayment recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.post('/:id/credit/adjust', requireRole('super_admin'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { amount, note, credit_limit } = req.body
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')

    const { data: customer } = await supabase.from('customers').select('id').eq('id', customer_id).single()
    if (!customer) return error(res, 'Customer not found', 404)

    let { data: account } = await supabase.from('credit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()

    if (!account) {
      if (credit_limit === undefined || credit_limit < 0) {
        return error(res, 'credit_limit is required to open a new credit account for this customer')
      }
      const { data: newAccount, error: openErr } = await supabase
        .from('credit_accounts')
        .insert({ customer_id, credit_limit, opened_by: req.user.id })
        .select().single()

      if (openErr) return error(res, 'Could not open credit account', 500)
      account = newAccount
      await supabase.from('customers').update({ credit_limit, credit_status: 'active' }).eq('id', customer_id)
    }

    const newBalance = Number(account.current_balance) + Number(amount)

    const { data: updated, error: dbError } = await supabase
      .from('credit_accounts').update({ current_balance: newBalance }).eq('id', account.id).select().single()

    if (dbError) return error(res, 'Could not adjust balance', 500)

    await supabase.from('credit_transactions').insert({
      credit_account_id: account.id, type: 'debit', amount, sale_id: null, balance_after: newBalance, note: note || null
    })

    await supabase.from('audit_logs').insert({
      user_id: req.user.id, action: 'manual_debt_adjustment', entity_type: 'credit_account', entity_id: account.id, new_value: { amount, note: note || null, newBalance }
    })

    return success(res, updated, 'Manual debt entry recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.post('/:id/credit/repay-from-deposit', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { id: customer_id } = req.params
    const { amount } = req.body
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')

    const { data: creditAccount } = await supabase.from('credit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()
    if (!creditAccount) return error(res, 'This customer has no credit account')
    if (Number(amount) > Number(creditAccount.current_balance)) return error(res, 'Amount exceeds the outstanding credit balance')

    const { data: depositAccount } = await supabase.from('deposit_accounts').select('*').eq('customer_id', customer_id).maybeSingle()
    if (!depositAccount) return error(res, 'This customer has no deposit account')
    if (Number(amount) > Number(depositAccount.current_balance)) return error(res, "Amount exceeds the customer's deposit balance")

    const newCreditBalance = Number(creditAccount.current_balance) - Number(amount)
    const newDepositBalance = Number(depositAccount.current_balance) - Number(amount)

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({ credit_account_id: creditAccount.id, amount, payment_method: 'deposit', confirmed_by: req.user.id })
      .select().single()

    if (payErr) return error(res, 'Could not record payment', 500)

    const { error: creditErr } = await supabase.from('credit_accounts').update({ current_balance: newCreditBalance }).eq('id', creditAccount.id)
    if (creditErr) return error(res, 'Could not update credit balance', 500)

    await supabase.from('credit_transactions').insert({
      credit_account_id: creditAccount.id, type: 'credit', amount, payment_id: payment.id, balance_after: newCreditBalance, note: 'Paid from deposit balance'
    })

    const { error: depositErr } = await supabase.from('deposit_accounts').update({ current_balance: newDepositBalance }).eq('id', depositAccount.id)
    if (depositErr) return error(res, 'Could not update deposit balance', 500)

    await supabase.from('deposit_transactions').insert({
      deposit_account_id: depositAccount.id, type: 'deposit_out', amount, balance_after: newDepositBalance, note: 'Used to repay credit balance'
    })

    await supabase.from('audit_logs').insert({
      user_id: req.user.id, action: 'repay_from_deposit', entity_type: 'credit_account', entity_id: creditAccount.id, new_value: { amount, newCreditBalance, newDepositBalance }
    })

    return success(res, { payment, new_credit_balance: newCreditBalance, new_deposit_balance: newDepositBalance }, 'Credit repaid from deposit balance')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router