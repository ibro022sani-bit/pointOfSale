import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'
import { sendSMS } from '../lib/termii.js'

const router = express.Router()
router.use(requireAuth)

router.post('/sms/bulk', requireRole('super_admin'), async (req, res) => {
  try {
    const { customer_ids, message } = req.body
    if (!Array.isArray(customer_ids) || customer_ids.length === 0) return error(res, 'customer_ids array is required')
    if (!message || !message.trim()) return error(res, 'message is required')

    const { data: customers } = await supabase.from('customers').select('id, name, phone').in('id', customer_ids)

    const results = []
    for (const customerId of customer_ids) {
      const customer = customers.find(c => c.id === customerId)
      if (!customer) {
        results.push({ customer_id: customerId, success: false, reason: 'Customer not found' })
        continue
      }
      if (!customer.phone) {
        results.push({ customer_id: customerId, customer_name: customer.name, success: false, reason: 'No phone number on file' })
        continue
      }

      const sent = await sendSMS(customer.phone, message)

      await supabase.from('notifications').insert({
        type: 'bulk_reminder', recipient_type: 'customer', recipient_id: customerId,
        message, channel: 'sms', status: sent ? 'sent' : 'failed'
      })

      results.push({ customer_id: customerId, customer_name: customer.name, success: sent, reason: sent ? null : 'SMS delivery failed' })
    }

    const sent_count = results.filter(r => r.success).length
    const failed_count = results.length - sent_count

    return success(res, { sent_count, failed_count, results }, `Sent ${sent_count} of ${results.length} messages`)
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router