import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requirePlatformAdmin, clearTenantStatusCache } from '../lib/middleware.js'
import { isExpired, autoDeactivate, endOfLagosDay, parsePaidUntil } from '../lib/subscription.js'

const router = express.Router()
router.use(requirePlatformAdmin)

// Adds months to a date and lands on the end of that day in Lagos time
const addMonths = (date, n) => {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + n)
  if (d.getDate() < day) d.setDate(0) // e.g. 31 Jan + 1 month -> end of Feb
  d.setTime(endOfLagosDay(d).getTime())
  return d
}

router.get('/tenants', async (req, res) => {
  try {
    const { data: tenants, error: dbError } = await supabase
      .from('tenants').select('*').order('created_at', { ascending: false })
    if (dbError) return error(res, 'Could not fetch businesses', 500)

    const { data: owners } = await supabase
      .from('users').select('tenant_id, name, email, phone, created_at')
      .eq('role', 'super_admin').order('created_at', { ascending: true })

    const ownerByTenant = {}
    for (const o of owners || []) {
      if (!ownerByTenant[o.tenant_id]) ownerByTenant[o.tenant_id] = o
    }

    // Businesses past their grace period are deactivated as soon as you open this list
    await Promise.all(tenants.filter((t) => isExpired(t)).map((t) => autoDeactivate(t)))

    return success(
      res,
      tenants.map((t) => {
        const expired = isExpired(t)
        return {
          ...t,
          status: expired ? 'deactivated' : t.status,
          status_note: expired ? 'Automatically deactivated: payment overdue' : t.status_note,
          owner: ownerByTenant[t.id] || null,
        }
      }),
      'Businesses fetched'
    )
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// Activate / deactivate a business and/or update its "paid until" date and note
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, paid_until, note } = req.body

    const updates = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      if (!['active', 'deactivated'].includes(status)) return error(res, 'status must be active or deactivated')
      updates.status = status
      if (status === 'active') updates.activated_at = new Date().toISOString()
    }
    if (paid_until !== undefined) {
      if (paid_until && isNaN(new Date(paid_until).getTime())) return error(res, 'Invalid paid_until date')
      updates.paid_until = paid_until ? parsePaidUntil(paid_until) : null
    }
    if (note !== undefined) updates.status_note = note || null

    // Activating with a date that has already run out (including grace) would just be
    // deactivated again straight away, so ask for a later date instead.
    if (status === 'active' && updates.paid_until && isExpired({ status: 'active', paid_until: updates.paid_until })) {
      return error(res, 'That paid-until date has already passed. Choose a later date, clear the date, or record a payment instead.')
    }

    const { data, error: dbError } = await supabase
      .from('tenants').update(updates).eq('id', id).select().single()
    if (dbError || !data) return error(res, 'Business not found', 404)

    clearTenantStatusCache(id)

    await supabase.from('audit_logs').insert({
      tenant_id: id, user_id: req.user.id, action: status || 'update',
      entity_type: 'tenant', entity_id: id, new_value: updates
    })

    return success(res, data, 'Business updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/tenants/:id/payments', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('tenant_payments')
      .select('*')
      .eq('tenant_id', req.params.id)
      .order('created_at', { ascending: false })
    if (dbError) return error(res, 'Could not fetch payments', 500)
    return success(res, data, 'Payments fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/tenants/:id/payments', async (req, res) => {
  try {
    const { id } = req.params
    const amount = Number(req.body.amount)
    const months = parseInt(req.body.months, 10)
    const method = req.body.payment_method || 'transfer'

    if (!(amount > 0)) return error(res, 'Enter a valid amount')
    if (!Number.isInteger(months) || months < 1 || months > 36) return error(res, 'Months must be between 1 and 36')
    if (!['transfer', 'cash', 'pos', 'other'].includes(method)) return error(res, 'Invalid payment method')

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants').select('id, status, paid_until').eq('id', id).single()
    if (tenantErr || !tenant) return error(res, 'Business not found', 404)

    // New time is added after the current paid-until date if it is still in the future
    const now = new Date()
    const start = tenant.paid_until && new Date(tenant.paid_until) > now ? new Date(tenant.paid_until) : now
    const end = addMonths(start, months)

    const { data: payment, error: payErr } = await supabase
      .from('tenant_payments')
      .insert({
        tenant_id: id,
        amount,
        payment_method: method,
        reference: req.body.reference?.trim() || null,
        months,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        note: req.body.note?.trim() || null,
        recorded_by: req.user.id,
      })
      .select()
      .single()
    if (payErr) return error(res, 'Could not record payment', 500)

    const patch = { status: 'active', paid_until: end.toISOString(), updated_at: now.toISOString() }
    if (tenant.status !== 'active') {
      patch.activated_at = now.toISOString()
      patch.status_note = null // clears an old "automatically deactivated" note
    }

    const { data: updated, error: updateErr } = await supabase
      .from('tenants').update(patch).eq('id', id).select().single()
    if (updateErr) {
      return error(res, 'Payment was recorded, but the account could not be updated. Please set "Paid until" manually.', 500)
    }

    clearTenantStatusCache(id)

    // If this business was referred, its first payment earns the referrer a reward
    const referral = await rewardReferral(id).catch(() => null)

    return success(res, { payment, tenant: updated, referral }, 'Payment recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// When a referred business makes its first recorded payment, create the referrer's reward.
// The reward type and value are taken from the referrer's settings at this moment.
async function rewardReferral(tenantId) {
  const { data: referral } = await supabase
    .from('referrals').select('*')
    .eq('referred_tenant_id', tenantId).eq('reward_status', 'waiting').maybeSingle()
  if (!referral) return null

  const now = new Date()
  // Claim it first so a double click can never reward twice
  const { data: claimed } = await supabase
    .from('referrals')
    .update({ reward_status: 'pending', triggered_at: now.toISOString() })
    .eq('id', referral.id).eq('reward_status', 'waiting')
    .select().maybeSingle()
  if (!claimed) return null

  const { data: referrer } = await supabase.from('referrers').select('*').eq('id', referral.referrer_id).single()
  const patch = {}

  if (!referrer || !(Number(referrer.reward_value) > 0)) {
    patch.reward_status = 'cancelled'
    patch.note = 'No reward was set for this referrer when the business made its first payment'
  } else if (referrer.reward_type === 'months' && referrer.linked_tenant_id) {
    const { data: linked } = await supabase
      .from('tenants').select('paid_until').eq('id', referrer.linked_tenant_id).single()
    const months = Math.round(Number(referrer.reward_value))
    if (linked?.paid_until) {
      const start = new Date(linked.paid_until) > now ? new Date(linked.paid_until) : now
      const end = addMonths(start, months)
      await supabase
        .from('tenants').update({ paid_until: end.toISOString(), updated_at: now.toISOString() })
        .eq('id', referrer.linked_tenant_id)
      clearTenantStatusCache(referrer.linked_tenant_id)
      Object.assign(patch, {
        reward_type: 'months', reward_value: months, reward_status: 'paid', paid_at: now.toISOString(),
        note: `Added ${months} month(s) to the referrer's subscription`,
      })
    } else {
      // The referrer's own business has no paid-until date, so there is nothing to extend
      Object.assign(patch, {
        reward_type: 'months', reward_value: months, reward_status: 'pending',
        note: "The referrer's business has no paid-until date. Decide how to reward them.",
      })
    }
  } else {
    Object.assign(patch, {
      reward_type: referrer.reward_type,
      reward_value: referrer.reward_value,
      reward_status: 'pending',
      note: referrer.reward_type === 'months' ? 'Months reward, but the referrer has no business. Decide how to reward them.' : null,
    })
  }

  const { data: final } = await supabase.from('referrals').update(patch).eq('id', referral.id).select().single()
  return final
}

export default router