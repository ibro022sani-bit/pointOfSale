import express from 'express'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'
import { cleanName } from '../lib/catalog.js'
import { METHODS, todayLagos, checkExpenseDate, cleanText, readAmount } from '../lib/expenseRules.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('super_admin', 'admin'))

const isOwner = (req) => req.user.role === 'super_admin'
const WITH_NAMES = '*, branches(name), users:recorded_by(name)'

// The official spelling of a category from this business's list, or null if it is not on the list
async function findCategory(req, name) {
  const wanted = cleanName(name).toLowerCase()
  if (!wanted) return null
  const { data } = await req.db.from('expense_categories').select('name')
  return (data || []).find((c) => c.name.toLowerCase() === wanted)?.name || null
}

async function branchExists(req, id) {
  const { data } = await req.db.from('branches').select('id').eq('id', id).maybeSingle()
  return !!data
}

// ---------- Categories (placed before "/:id" so they are not mistaken for an id) ----------

router.get('/categories', async (req, res) => {
  try {
    const { data, error: dbError } = await req.db.from('expense_categories').select('id, name').order('name')
    if (dbError) return error(res, 'Could not fetch categories', 500)
    return success(res, data, 'Categories fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// Owners and managers can add a category while recording an expense
router.post('/categories', async (req, res) => {
  try {
    const name = cleanName(req.body.name)
    if (!name) return error(res, 'Category name is required')
    const { data, error: dbError } = await req.db
      .from('expense_categories').insert({ name }).select('id, name').single()
    if (dbError) {
      if (dbError.code === '23505') return error(res, 'That category already exists')
      return error(res, 'Could not add category', 500)
    }
    return success(res, data, 'Category added')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// Renaming and deleting categories is for the owner only
router.put('/categories/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const name = cleanName(req.body.name)
    if (!name) return error(res, 'Category name is required')

    const { data: existing } = await req.db.from('expense_categories').select('id, name').eq('id', id).maybeSingle()
    if (!existing) return error(res, 'Category not found', 404)

    const { data, error: dbError } = await req.db
      .from('expense_categories').update({ name }).eq('id', id).select('id, name').single()
    if (dbError) {
      if (dbError.code === '23505') return error(res, 'That category already exists')
      return error(res, 'Could not rename category', 500)
    }

    // Past expenses follow the new name
    if (name !== existing.name) {
      const { error: moveErr } = await req.db.from('expenses').update({ category: name }).eq('category', existing.name)
      if (moveErr) {
        await req.db.from('expense_categories').update({ name: existing.name }).eq('id', id)
        return error(res, 'Could not rename category', 500)
      }
    }
    return success(res, data, 'Category renamed')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// Deleting a category only removes it from the list. Expenses already recorded keep their category.
router.delete('/categories/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await req.db.from('expense_categories').select('id, name').eq('id', id).maybeSingle()
    if (!existing) return error(res, 'Category not found', 404)

    const { error: dbError } = await req.db.from('expense_categories').delete().eq('id', id)
    if (dbError) return error(res, 'Could not delete category', 500)
    return success(res, {}, 'Category deleted')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// ---------- Expenses ----------

router.get('/', async (req, res) => {
  try {
    let { branch_id, category, date_from, date_to } = req.query
    if (!isOwner(req)) {
      if (!req.user.branch_id) return success(res, [], 'Expenses fetched')
      branch_id = req.user.branch_id // managers only ever see their own branch
    }

    let query = req.db
      .from('expenses')
      .select(WITH_NAMES)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (branch_id === 'none') query = query.is('branch_id', null) // business-wide expenses
    else if (branch_id) query = query.eq('branch_id', branch_id)
    if (category) query = query.eq('category', category)
    if (date_from) query = query.gte('expense_date', String(date_from).slice(0, 10))
    if (date_to) query = query.lte('expense_date', String(date_to).slice(0, 10))

    const { data, error: dbError } = await query
    if (dbError) return error(res, 'Could not fetch expenses', 500)
    return success(res, data, 'Expenses fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/', async (req, res) => {
  try {
    const body = req.body

    // Which branch (the owner may also choose "business-wide", which means no branch)
    let branch_id
    if (isOwner(req)) {
      if (!('branch_id' in body)) return error(res, 'Choose a branch, or business-wide')
      branch_id = body.branch_id || null
      if (branch_id && !(await branchExists(req, branch_id))) return error(res, 'Branch not found', 404)
    } else {
      branch_id = req.user.branch_id
      if (!branch_id) return error(res, 'Your account has no branch')
    }

    const category = await findCategory(req, body.category)
    if (!category) return error(res, 'Choose a category from the list, or add a new one')

    const amount = readAmount(body.amount)
    if (amount === null) return error(res, 'A valid amount is required')

    const expense_date = body.expense_date || todayLagos()
    const dateError = checkExpenseDate(expense_date, req.user.role)
    if (dateError) return error(res, dateError)

    const payment_method = body.payment_method || null
    if (payment_method && !METHODS.includes(payment_method)) return error(res, 'Invalid payment method')

    const { data: expense, error: dbError } = await req.db
      .from('expenses')
      .insert({
        branch_id,
        category,
        description: cleanText(body.description, 300),
        amount,
        expense_date,
        payment_method,
        reference: cleanText(body.reference, 80),
        recorded_by: req.user.id,
      })
      .select()
      .single()
    if (dbError) return error(res, 'Could not record expense', 500)

    await req.db.from('audit_logs').insert({
      user_id: req.user.id, action: 'create', entity_type: 'expense', entity_id: expense.id, new_value: expense,
    })
    return success(res, expense, 'Expense recorded')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { data, error: dbError } = await req.db
      .from('expenses').select(WITH_NAMES).eq('id', req.params.id).maybeSingle()
    if (dbError || !data) return error(res, 'Expense not found', 404)

    if (!isOwner(req) && data.branch_id !== req.user.branch_id) return error(res, 'Unauthorized', 403)
    return success(res, data, 'Expense fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// Edit: only what changed is saved, and the old and new values go into the activity log
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body

    const { data: existing } = await req.db.from('expenses').select('*').eq('id', id).maybeSingle()
    if (!existing) return error(res, 'Expense not found', 404)
    if (!isOwner(req) && existing.branch_id !== req.user.branch_id) return error(res, 'Unauthorized', 403)

    const updates = {}

    if ('branch_id' in body && (body.branch_id || null) !== existing.branch_id) {
      if (!isOwner(req)) return error(res, 'Only the owner can move an expense to another branch', 403)
      const branch_id = body.branch_id || null
      if (branch_id && !(await branchExists(req, branch_id))) return error(res, 'Branch not found', 404)
      updates.branch_id = branch_id
    }

    // An old category that has since been removed from the list can stay on an expense that keeps it
    if (body.category !== undefined && body.category !== existing.category) {
      const category = await findCategory(req, body.category)
      if (!category) return error(res, 'Choose a category from the list, or add a new one')
      updates.category = category
    }

    if (body.amount !== undefined) {
      const amount = readAmount(body.amount)
      if (amount === null) return error(res, 'A valid amount is required')
      updates.amount = amount
    }

    if (body.expense_date !== undefined && body.expense_date !== existing.expense_date) {
      const dateError = checkExpenseDate(body.expense_date, req.user.role)
      if (dateError) return error(res, dateError)
      updates.expense_date = body.expense_date
    }

    if (body.payment_method !== undefined) {
      const payment_method = body.payment_method || null
      if (payment_method && !METHODS.includes(payment_method)) return error(res, 'Invalid payment method')
      updates.payment_method = payment_method
    }
    if (body.description !== undefined) updates.description = cleanText(body.description, 300)
    if (body.reference !== undefined) updates.reference = cleanText(body.reference, 80)

    const changes = Object.entries(updates).filter(([key, value]) => value !== existing[key])
    if (changes.length === 0) return success(res, existing, 'No changes')

    const newValue = Object.fromEntries(changes)
    const oldValue = Object.fromEntries(changes.map(([key]) => [key, existing[key]]))

    const { data: expense, error: dbError } = await req.db
      .from('expenses')
      .update({ ...newValue, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (dbError) return error(res, 'Could not update expense', 500)

    await req.db.from('audit_logs').insert({
      user_id: req.user.id, action: 'update', entity_type: 'expense', entity_id: id,
      old_value: oldValue, new_value: newValue,
    })
    return success(res, expense, 'Expense updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

// Delete is for the owner only
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await req.db.from('expenses').select('*').eq('id', id).maybeSingle()
    if (!existing) return error(res, 'Expense not found', 404)

    const { error: dbError } = await req.db.from('expenses').delete().eq('id', id)
    if (dbError) return error(res, 'Could not delete expense', 500)

    await req.db.from('audit_logs').insert({
      user_id: req.user.id, action: 'delete', entity_type: 'expense', entity_id: id, old_value: existing,
    })
    return success(res, {}, 'Expense deleted')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router