import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('super_admin', 'admin'))

router.get('/', async (req, res) => {
  try {
    let { branch_id, category, date_from, date_to } = req.query
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id

    let query = supabase
      .from('expenses')
      .select('*, branches(name), users:recorded_by(name)')
      .order('created_at', { ascending: false })

    if (branch_id) query = query.eq('branch_id', branch_id)
    if (category) query = query.eq('category', category)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to)

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not fetch expenses', 500)
    return success(res, data, 'Expenses fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/', async (req, res) => {
  try {
    let { branch_id, category, description, amount } = req.body
    if (!branch_id) return error(res, 'branch_id is required')
    if (req.user.role !== 'super_admin') branch_id = req.user.branch_id
    if (!category) return error(res, 'category is required')
    if (!amount || amount <= 0) return error(res, 'A valid amount is required')

    const { data: expense, error: dbError } = await supabase
      .from('expenses')
      .insert({ branch_id, category, description: description || null, amount, recorded_by: req.user.id })
      .select().single()

    if (dbError) return error(res, 'Could not record expense', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create', entity_type: 'expense', entity_id: expense.id, new_value: expense })
    return success(res, expense, 'Expense recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('expenses').select('*, branches(name), users:recorded_by(name)').eq('id', req.params.id).single()

    if (dbError || !data) return error(res, 'Expense not found', 404)

    if (req.user.role !== 'super_admin' && data.branch_id !== req.user.branch_id) {
      return error(res, 'Unauthorized', 403)
    }

    return success(res, data, 'Expense fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('expenses').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Expense not found', 404)

    if (req.user.role !== 'super_admin' && existing.branch_id !== req.user.branch_id) {
      return error(res, 'Unauthorized', 403)
    }

    const { error: dbError } = await supabase.from('expenses').delete().eq('id', id)
    if (dbError) return error(res, 'Could not delete expense', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'delete', entity_type: 'expense', entity_id: id, old_value: existing })
    return success(res, {}, 'Expense deleted')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router