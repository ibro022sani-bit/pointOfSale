import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'
import { sendSMS } from '../lib/termii.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, credit_limit, credit_status, notification_preference, created_at, credit_account:credit_accounts(current_balance, credit_limit, status), deposit_account:deposit_accounts(id, current_balance)')
      .order('name', { ascending: true })
    if (dbError) return error(res, 'Could not fetch customers', 500)
    return success(res, data, 'Customers fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { name, phone, email, address } = req.body
    if (!name || !phone) return error(res, 'name and phone are required')

    const { data: existing } = await req.db.from('customers').select('id').eq('phone', phone).maybeSingle()
    if (existing) return error(res, 'A customer with this phone number already exists')


    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .insert({ name, phone, email: email || null, address: address || null })
      .select().single()

    if (dbError) return error(res, 'Could not create customer', 500)
    return success(res, customer, 'Customer created')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/search', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return error(res, 'Query parameter q is required')

    const { data, error: dbError } = await supabase
  .from('customers')
  .select('id, name, phone, email, address, credit_limit, credit_status, notification_preference, created_at, credit_account:credit_accounts(current_balance, credit_limit, status), deposit_account:deposit_accounts(id, current_balance)')
  .or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(50)

    if (dbError) return error(res, 'Search failed', 500)
    return success(res, data, 'Search results')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, credit_limit, credit_status, notification_preference, is_special_customer, created_at, credit_account:credit_accounts(current_balance, credit_limit, status), deposit_account:deposit_accounts(id, current_balance)')
      .eq('id', req.params.id).single()
    if (dbError || !data) return error(res, 'Customer not found', 404)
    return success(res, data, 'Customer fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await req.db.from('customers').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Customer not found', 404)

    const allowed = ['name', 'phone', 'email', 'address', 'notification_preference', 'is_special_customer']
    const updates = {}
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]

    const { data: updated, error: dbError } = await req.db.from('customers').update(updates).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not update customer', 500)
    return success(res, updated, 'Customer updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id/purchases', requireRole('super_admin', 'admin', 'cashier'), async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('sales')
      .select('*, branches(name), sale_items(*, products(name)))')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false })

    if (dbError) return error(res, 'Could not fetch purchase history', 500)
    return success(res, data, 'Purchase history fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/:id/reminders/send-now', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: customer } = await req.db.from('customers').select('*').eq('id', id).single()
    if (!customer) return error(res, 'Customer not found', 404)

    const { data: account } = await req.db.from('credit_accounts').select('*').eq('customer_id', id).maybeSingle()
    if (!account || Number(account.current_balance) <= 0) {
      return error(res, 'This customer has no outstanding balance')
    }

    const message = `Hi ${customer.name}, this is a reminder from Almubeen General Merchant that you have an outstanding balance of ₦${Number(account.current_balance).toLocaleString()}. Kindly settle at your earliest convenience.`

    const sent = await sendSMS(customer.phone, message)

    await req.db.from('notifications').insert({
      type: 'debt_reminder', recipient_type: 'customer', recipient_id: id,
      message, channel: 'sms', status: sent ? 'sent' : 'failed'
    })

    await req.db.from('debt_reminders').upsert({
      customer_id: id, last_sent_at: new Date(), is_active: true
    }, { onConflict: 'customer_id' })

    if (!sent) return error(res, 'Reminder could not be sent — SMS delivery failed', 500)
    return success(res, {}, 'Reminder sent')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router