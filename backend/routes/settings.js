import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)

router.get('/bank-accounts', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('bank_accounts').select('*').eq('is_active', true).order('created_at', { ascending: true })
    if (dbError) return error(res, 'Could not fetch bank accounts', 500)
    return success(res, data, 'Bank accounts fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/bank-accounts', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { bank_name, account_number, account_name } = req.body
    if (!bank_name || !account_number || !account_name) {
      return error(res, 'bank_name, account_number and account_name are required')
    }

    const { data: account, error: dbError } = await supabase
      .from('bank_accounts').insert({ bank_name, account_number, account_name }).select().single()

    if (dbError) return error(res, 'Could not create bank account', 500)
    return success(res, account, 'Bank account added')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/bank-accounts/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const allowed = ['bank_name', 'account_number', 'account_name', 'is_active']
    const updates = {}
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]

    const { data: updated, error: dbError } = await supabase.from('bank_accounts').update(updates).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not update bank account', 500)
    return success(res, updated, 'Bank account updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router