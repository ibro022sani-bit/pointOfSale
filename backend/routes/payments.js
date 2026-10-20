import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)

async function confirmPayment(req, res, expectedMethod) {
  try {
    if (!['super_admin', 'admin', 'cashier'].includes(req.user.role)) {
      return error(res, 'Unauthorized', 403)
    }

    const { sale_id, reference, amount_paid } = req.body
    if (!sale_id) return error(res, 'sale_id is required')

    const { data: sale } = await supabase.from('sales').select('*').eq('id', sale_id).single()
    if (!sale) return error(res, 'Sale not found', 404)

    const isSplit = ['split', 'deposit'].includes(sale.payment_method)
    const actualMethod = isSplit ? sale.payment_method_now : sale.payment_method
    if (actualMethod !== expectedMethod) return error(res, `This sale was not created as a ${expectedMethod} sale`)
    if (sale.payment_status === 'paid') return error(res, 'This sale has already been paid')

    const amountOwed = isSplit ? Number(sale.amount_paid) : Number(sale.total_amount)

    if (expectedMethod === 'cash') {
      if (!amount_paid) return error(res, 'amount_paid is required')
      if (Number(amount_paid) < amountOwed) return error(res, 'amount_paid is less than the amount due')
    }

    const paidAmount = expectedMethod === 'cash' ? Number(amount_paid) : amountOwed

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        sale_id, amount: amountOwed, payment_method: expectedMethod,
        reference: reference || null, confirmed_by: req.user.id
      })
      .select().single()

    if (payErr) return error(res, 'Could not record payment', 500)

    const changeGiven = expectedMethod === 'cash' ? paidAmount - amountOwed : 0

    const { error: saleErr } = await supabase
      .from('sales')
      .update({ amount_paid: paidAmount, change_given: changeGiven, payment_status: 'paid' })
      .eq('id', sale_id)

    if (saleErr) return error(res, 'Could not update sale', 500)

    const { data: receipt, error: receiptErr } = await supabase
      .from('sales')
      .select('*, branches(name, address, phone), customers(name, phone), users:cashier_id(name), sale_items(*, products(name, unit_of_measurement)))')
      .eq('id', sale_id).single()

    if (receiptErr) return error(res, 'Payment confirmed but could not load receipt', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'confirm_payment', entity_type: 'payment', entity_id: payment.id, new_value: payment })

    return success(res, { payment, sale: receipt }, 'Payment confirmed')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
}


router.post('/cash', (req, res) => confirmPayment(req, res, 'cash'))
router.post('/transfer/confirm', (req, res) => confirmPayment(req, res, 'transfer'))
router.post('/pos/confirm', (req, res) => confirmPayment(req, res, 'pos'))
router.post('/deposit/confirm', async (req, res) => {
  try {
    if (!['super_admin', 'admin', 'cashier'].includes(req.user.role)) {
      return error(res, 'Unauthorized', 403)
    }

    const { sale_id, amount, branch_id } = req.body
    if (!sale_id) return error(res, 'sale_id is required')
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')

    const effectiveBranchId = req.user.role === 'super_admin' ? (branch_id || null) : req.user.branch_id

    const { data: sale } = await supabase.from('sales').select('*').eq('id', sale_id).single()
    if (!sale) return error(res, 'Sale not found', 404)
    if (sale.payment_status === 'paid') return error(res, 'This sale has already been paid')
    if (!sale.customer_id) return error(res, 'This sale has no customer attached — cannot pay via deposit')

    const { data: account } = await supabase.from('deposit_accounts').select('*').eq('customer_id', sale.customer_id).maybeSingle()
    if (!account) return error(res, 'This customer has no deposit account')
    if (Number(amount) > Number(account.current_balance)) return error(res, "Amount exceeds the customer's deposit balance")

    const newBalance = Number(account.current_balance) - Number(amount)

    const { error: balErr } = await supabase.from('deposit_accounts').update({ current_balance: newBalance }).eq('id', account.id)
    if (balErr) return error(res, 'Could not update deposit balance', 500)

    await supabase.from('deposit_transactions').insert({
      deposit_account_id: account.id, type: 'deposit_out', amount, sale_id, balance_after: newBalance, note: null, confirmed_by: req.user.id, branch_id: effectiveBranchId
    })

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({ sale_id, amount, payment_method: 'deposit', confirmed_by: req.user.id, branch_id: effectiveBranchId })
      .select().single()

    if (payErr) return error(res, 'Could not record payment', 500)

    const hasTopUp = sale.payment_method === 'split' && ['cash', 'transfer', 'pos'].includes(sale.payment_method_now)

    let updatedSale = sale
    if (!hasTopUp) {
      const { data: fullyPaidSale, error: saleErr } = await supabase
        .from('sales')
        .update({ amount_paid: amount, change_given: 0, payment_status: 'paid' })
        .eq('id', sale_id).select().single()
      if (saleErr) return error(res, 'Could not update sale', 500)
      updatedSale = fullyPaidSale
    }

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'confirm_payment', entity_type: 'payment', entity_id: payment.id, new_value: payment })

    return success(res, { payment, sale: updatedSale, deposit_balance: newBalance },
      hasTopUp ? 'Deposit portion confirmed — top-up payment still required' : 'Payment confirmed')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
export default router