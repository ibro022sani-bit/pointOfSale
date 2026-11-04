import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { rateLimit } from '../lib/rateLimit.js'

const router = express.Router()

// A referrer's private page. No login: the long random link is the key.
router.get('/:token', rateLimit('referrer-portal', 60, 600), async (req, res) => {
  try {
    const token = String(req.params.token || '')
    if (token.length < 32) return error(res, 'Link not found', 404)

    const { data: referrer } = await supabase
      .from('referrers')
      .select('id, name, code, reward_type, reward_value, is_active')
      .eq('access_token', token)
      .maybeSingle()
    if (!referrer) return error(res, 'Link not found', 404)

    const { data: referrals } = await supabase
      .from('referrals')
      .select('referred_tenant_id, reward_type, reward_value, reward_status, created_at, paid_at')
      .eq('referrer_id', referrer.id)
      .order('created_at', { ascending: false })

    const ids = (referrals || []).map((r) => r.referred_tenant_id)
    const { data: tenants } = ids.length
      ? await supabase.from('tenants').select('id, name').in('id', ids)
      : { data: [] }
    const nameById = Object.fromEntries((tenants || []).map((t) => [t.id, t.name]))

    const list = (referrals || []).map((r) => ({
      business_name: nameById[r.referred_tenant_id] || 'A business',
      signed_up_at: r.created_at,
      reward_status: r.reward_status,
      reward_type: r.reward_type,
      reward_value: r.reward_value,
      paid_at: r.paid_at,
    }))

    const sum = (arr) => arr.reduce((s, x) => s + Number(x.reward_value || 0), 0)
    const stats = {
      total: list.length,
      waiting: list.filter((x) => x.reward_status === 'waiting').length,
      owed_money: sum(list.filter((x) => x.reward_status === 'pending' && x.reward_type === 'money')),
      paid_money: sum(list.filter((x) => x.reward_status === 'paid' && x.reward_type === 'money')),
      paid_months: sum(list.filter((x) => x.reward_status === 'paid' && x.reward_type === 'months')),
    }

    return success(res, { referrer, stats, referrals: list }, 'Referrer page')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router