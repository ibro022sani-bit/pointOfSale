import express from 'express'
import crypto from 'crypto'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requirePlatformAdmin } from '../lib/middleware.js'

const router = express.Router()
router.use(requirePlatformAdmin)

// Codes avoid look-alike characters (0/O, 1/I)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const makeCode = () =>
  Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')

function readReward(body, linkedTenantId) {
  const type = body.reward_type
  const value = Number(body.reward_value)
  if (!['money', 'months'].includes(type)) return { error: 'Choose a reward type' }
  if (!(value >= 0)) return { error: 'Enter a valid reward value' }
  if (type === 'months') {
    if (!Number.isInteger(value) || value > 36) return { error: 'Months must be a whole number up to 36' }
    if (!linkedTenantId) {
      return { error: 'A months reward needs the referrer to be linked to a business. Use money for people without a business.' }
    }
  }
  return { type, value }
}

router.get('/referrers', async (req, res) => {
  try {
    const { data: referrers, error: e1 } = await supabase
      .from('referrers').select('*').order('created_at', { ascending: false })
    const { data: referrals, error: e2 } = await supabase
      .from('referrals').select('referrer_id, reward_type, reward_value, reward_status')
    if (e1 || e2) return error(res, 'Could not fetch referrers', 500)

    const linkedIds = [...new Set(referrers.map((r) => r.linked_tenant_id).filter(Boolean))]
    const { data: linked } = linkedIds.length
      ? await supabase.from('tenants').select('id, name').in('id', linkedIds)
      : { data: [] }
    const linkedName = Object.fromEntries((linked || []).map((t) => [t.id, t.name]))

    const result = referrers.map((r) => {
      const mine = referrals.filter((x) => x.referrer_id === r.id)
      return {
        ...r,
        linked_tenant_name: r.linked_tenant_id ? linkedName[r.linked_tenant_id] || null : null,
        stats: {
          total: mine.length,
          waiting: mine.filter((x) => x.reward_status === 'waiting').length,
          owed_money: mine
            .filter((x) => x.reward_status === 'pending' && x.reward_type === 'money')
            .reduce((s, x) => s + Number(x.reward_value || 0), 0),
          paid_money: mine
            .filter((x) => x.reward_status === 'paid' && x.reward_type === 'money')
            .reduce((s, x) => s + Number(x.reward_value || 0), 0),
          paid_months: mine
            .filter((x) => x.reward_status === 'paid' && x.reward_type === 'months')
            .reduce((s, x) => s + Number(x.reward_value || 0), 0),
        },
      }
    })
    return success(res, result, 'Referrers fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/referrers', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 80)
    const phone = String(req.body.phone || '').trim().slice(0, 30)
    if (!name || !phone) return error(res, 'Name and phone number are required')

    const linked = req.body.linked_tenant_id || null
    const reward = readReward(req.body, linked)
    if (reward.error) return error(res, reward.error)

    for (let i = 0; i < 5; i++) {
      const { data, error: dbError } = await supabase
        .from('referrers')
        .insert({
          name, phone, code: makeCode(), linked_tenant_id: linked,
          reward_type: reward.type, reward_value: reward.value,
          note: req.body.note?.trim() || null,
        })
        .select().single()
      if (!dbError) return success(res, data, 'Referrer added')
      if (dbError.code !== '23505') return error(res, 'Could not add referrer', 500)
    }
    return error(res, 'Could not generate a unique code. Please try again.', 500)
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/referrers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body
    const { data: existing } = await supabase.from('referrers').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Referrer not found', 404)

    const updates = {}
    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 80)
      if (!name) return error(res, 'Name cannot be empty')
      updates.name = name
    }
    if (body.phone !== undefined) {
      const phone = String(body.phone).trim().slice(0, 30)
      if (!phone) return error(res, 'Phone number cannot be empty')
      updates.phone = phone
    }
    const linked = body.linked_tenant_id !== undefined ? body.linked_tenant_id || null : existing.linked_tenant_id
    if (body.linked_tenant_id !== undefined) updates.linked_tenant_id = linked

    if (body.reward_type !== undefined || body.reward_value !== undefined || body.linked_tenant_id !== undefined) {
      const reward = readReward(
        { reward_type: body.reward_type ?? existing.reward_type, reward_value: body.reward_value ?? existing.reward_value },
        linked
      )
      if (reward.error) return error(res, reward.error)
      updates.reward_type = reward.type
      updates.reward_value = reward.value
    }
    if (body.is_active !== undefined) updates.is_active = !!body.is_active
    if (body.note !== undefined) updates.note = String(body.note).trim() || null

    const { data, error: dbError } = await supabase
      .from('referrers').update(updates).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not update referrer', 500)
    return success(res, data, 'Referrer updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/', async (req, res) => {
  try {
    const { data: referrals, error: dbError } = await supabase
      .from('referrals').select('*').order('created_at', { ascending: false })
    if (dbError) return error(res, 'Could not fetch referrals', 500)

    const tenantIds = [...new Set(referrals.map((r) => r.referred_tenant_id))]
    const referrerIds = [...new Set(referrals.map((r) => r.referrer_id))]
    const { data: tenants } = tenantIds.length
      ? await supabase.from('tenants').select('id, name, status').in('id', tenantIds)
      : { data: [] }
    const { data: referrers } = referrerIds.length
      ? await supabase.from('referrers').select('id, name, code, phone').in('id', referrerIds)
      : { data: [] }

    const tenantById = Object.fromEntries((tenants || []).map((t) => [t.id, t]))
    const referrerById = Object.fromEntries((referrers || []).map((r) => [r.id, r]))

    return success(
      res,
      referrals.map((r) => ({
        ...r,
        referred: tenantById[r.referred_tenant_id] || null,
        referrer: referrerById[r.referrer_id] || null,
      })),
      'Referrals fetched'
    )
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params
    const { data: referral } = await supabase.from('referrals').select('*').eq('id', id).single()
    if (!referral) return error(res, 'Referral not found', 404)
    if (referral.reward_status !== 'pending') return error(res, 'Only rewards waiting to be paid out can be marked as paid')

    const { data, error: dbError } = await supabase
      .from('referrals')
      .update({
        reward_status: 'paid',
        paid_at: new Date().toISOString(),
        payout_reference: req.body.payout_reference?.trim() || null,
      })
      .eq('id', id).eq('reward_status', 'pending')
      .select().single()
    if (dbError) return error(res, 'Could not mark as paid', 500)
    return success(res, data, 'Marked as paid')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const { data: referral } = await supabase.from('referrals').select('*').eq('id', id).single()
    if (!referral) return error(res, 'Referral not found', 404)
    if (!['waiting', 'pending'].includes(referral.reward_status)) return error(res, 'This reward can no longer be cancelled')

    const { data, error: dbError } = await supabase
      .from('referrals')
      .update({ reward_status: 'cancelled', note: req.body.note?.trim() || referral.note })
      .eq('id', id)
      .select().single()
    if (dbError) return error(res, 'Could not cancel reward', 500)
    return success(res, data, 'Reward cancelled')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router