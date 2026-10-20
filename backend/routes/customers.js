import express from 'express'
import bcrypt from 'bcryptjs'
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
    const { name, phone, email, password, address } = req.body
    if (!name || !phone) return error(res, 'name and phone are required')

    const { data: existing } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
    if (existing) return error(res, 'A customer with this phone number already exists')

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .insert({ name, phone, email: email || null, password: hashedPassword, address: address || null })
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

router.get('/me', async (req, res) => {
  try {
    if (req.user.role !== 'customer') return error(res, 'This endpoint is for customer accounts only', 403)

    const { data, error: dbError } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, credit_limit, credit_status, notification_preference, created_at, credit_account:credit_accounts(current_balance, credit_limit, status), deposit_account:deposit_accounts(id, current_balance)')
      .eq('id', req.user.id).single()

    if (dbError || !data) return error(res, 'Customer not found', 404)
    return success(res, data, 'Profile fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.put('/me', async (req, res) => {
  try {
    if (req.user.role !== 'customer') return error(res, 'This endpoint is for customer accounts only', 403)

    const { name, email } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email

    if (Object.keys(updates).length === 0) return error(res, 'Nothing to update')

    const { data: updated, error: dbError } = await supabase
      .from('customers').update(updates).eq('id', req.user.id).select('id, name, phone, email, address, credit_limit, credit_status, notification_preference, created_at').single()

    if (dbError) {
      if (dbError.code === '23505') return error(res, 'This email is already in use')
      return error(res, 'Could not update profile', 500)
    }

    return success(res, updated, 'Profile updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/me/password', async (req, res) => {
  try {
    if (req.user.role !== 'customer') return error(res, 'This endpoint is for customer accounts only', 403)

    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return error(res, 'current_password and new_password are required')
    if (new_password.length < 6) return error(res, 'New password must be at least 6 characters')

    const { data: customer } = await supabase.from('customers').select('password').eq('id', req.user.id).single()
    if (!customer || !customer.password) return error(res, 'Account not found', 404)

    const match = await bcrypt.compare(current_password, customer.password)
    if (!match) return error(res, 'Current password is incorrect')

    const hashedPassword = await bcrypt.hash(new_password, 10)
    const { error: dbError } = await supabase.from('customers').update({ password: hashedPassword }).eq('id', req.user.id)
    if (dbError) return error(res, 'Could not update password', 500)

    return success(res, {}, 'Password updated')
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
    const { data: existing } = await supabase.from('customers').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Customer not found', 404)

    const allowed = ['name', 'phone', 'email', 'address', 'notification_preference', 'is_special_customer']
    const updates = {}
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]

    const { data: updated, error: dbError } = await supabase.from('customers').update(updates).eq('id', id).select().single()
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
    const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single()
    if (!customer) return error(res, 'Customer not found', 404)

    const { data: account } = await supabase.from('credit_accounts').select('*').eq('customer_id', id).maybeSingle()
    if (!account || Number(account.current_balance) <= 0) {
      return error(res, 'This customer has no outstanding balance')
    }

    const message = `Hi ${customer.name}, this is a reminder from Sadeeq Agrovet that you have an outstanding balance of ₦${Number(account.current_balance).toLocaleString()}. Kindly settle at your earliest convenience.`

    const sent = await sendSMS(customer.phone, message)

    await supabase.from('notifications').insert({
      type: 'debt_reminder', recipient_type: 'customer', recipient_id: id,
      message, channel: 'sms', status: sent ? 'sent' : 'failed'
    })

    await supabase.from('debt_reminders').upsert({
      customer_id: id, last_sent_at: new Date(), is_active: true
    }, { onConflict: 'customer_id' })

    if (!sent) return error(res, 'Reminder could not be sent — SMS delivery failed', 500)
    return success(res, {}, 'Reminder sent')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/reset-password', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body
    if (!newPassword) return error(res, 'newPassword is required')
    if (newPassword.length < 6) return error(res, 'Password must be at least 6 characters')

    const { data: customer } = await supabase.from('customers').select('id').eq('id', id).single()
    if (!customer) return error(res, 'Customer not found', 404)
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const { error: dbError } = await supabase.from('customers').update({ password: hashedPassword }).eq('id', id)
    if (dbError) return error(res, 'Could not reset password', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'reset_password', entity_type: 'customer', entity_id: id })
    return success(res, {}, 'Password reset successful')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})


export default router