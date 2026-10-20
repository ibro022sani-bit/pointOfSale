import express from 'express'
import bcrypt from 'bcryptjs'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('super_admin', 'admin'))

router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('users').select('id, name, email, phone, role, branch_id, is_active, created_at, branches(name)')
      .order('name', { ascending: true })

    if (req.user.role !== 'super_admin') query = query.eq('branch_id', req.user.branch_id)

    const { data, error: dbError } = await query

    if (dbError) return error(res, 'Could not fetch staff', 500)
    return success(res, data, 'Staff fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, password, role, branch_id } = req.body
    if (!name || !email || !password || !role) return error(res, 'name, email, password and role are required')
    if (password.length < 6) return error(res, 'Password must be at least 6 characters')
    if (!['super_admin', 'admin', 'cashier'].includes(role)) return error(res, 'Invalid role')

    let finalBranchId = branch_id

    if (req.user.role === 'admin') {
      if (role !== 'cashier') return error(res, 'Admins can only create cashier accounts', 403)
      finalBranchId = req.user.branch_id
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
    if (existing) return error(res, 'A staff account with this email already exists')

    const hashedPassword = await bcrypt.hash(password, 10)
    const { data: user, error: dbError } = await supabase
      .from('users')
      .insert({ name, email, phone: phone || null, password: hashedPassword, role, branch_id: finalBranchId || null })
      .select('id, name, email, phone, role, branch_id, is_active, created_at').single()

    if (dbError) return error(res, 'Could not create staff account', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create', entity_type: 'user', entity_id: user.id, new_value: user })
    return success(res, user, 'Staff account created')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('users').select('id, name, email, phone, role, branch_id, is_active, created_at, branches(name)')
      .eq('id', req.params.id).single()

    if (dbError || !data) return error(res, 'Staff member not found', 404)
    return success(res, data, 'Staff member fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('users').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Staff member not found', 404)

    if (req.user.role === 'admin' && existing.branch_id !== req.user.branch_id) {
      return error(res, 'You can only edit staff in your own branch', 403)
    }

    const { name, phone, role, branch_id } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (role !== undefined) {
      if (req.user.role === 'admin' && role === 'super_admin') return error(res, 'Admins cannot assign super_admin role', 403)
      updates.role = role
    }
    if (branch_id !== undefined) {
      if (req.user.role !== 'super_admin') return error(res, 'Only a super admin can reassign branches', 403)
      if (branch_id) {
        const { data: branch } = await supabase.from('branches').select('id').eq('id', branch_id).single()
        if (!branch) return error(res, 'Branch not found', 404)
      }
      updates.branch_id = branch_id || null
    }
    updates.updated_at = new Date()

    const { data: updated, error: dbError } = await supabase.from('users').update(updates).eq('id', id)
      .select('id, name, email, phone, role, branch_id, is_active').single()

    if (dbError) return error(res, 'Could not update staff member', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'update', entity_type: 'user', entity_id: id, old_value: existing, new_value: updated })
    return success(res, updated, 'Staff member updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('users').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Staff member not found', 404)
    if (req.user.role === 'admin' && existing.branch_id !== req.user.branch_id) {
      return error(res, 'You can only manage staff in your own branch', 403)
    }

    const { data: updated, error: dbError } = await supabase.from('users').update({ is_active: true, updated_at: new Date() }).eq('id', id)
      .select('id, name, email, is_active').single()

    if (dbError) return error(res, 'Could not activate staff member', 500)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'activate', entity_type: 'user', entity_id: id })
    return success(res, updated, 'Staff member activated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('users').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Staff member not found', 404)
    if (req.user.role === 'admin' && existing.branch_id !== req.user.branch_id) {
      return error(res, 'You can only manage staff in your own branch', 403)
    }
    if (existing.id === req.user.id) return error(res, 'You cannot deactivate your own account')

    const { data: updated, error: dbError } = await supabase.from('users').update({ is_active: false, updated_at: new Date() }).eq('id', id)
      .select('id, name, email, is_active').single()

    if (dbError) return error(res, 'Could not deactivate staff member', 500)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'deactivate', entity_type: 'user', entity_id: id })
    return success(res, updated, 'Staff member deactivated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/branch', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { branch_id } = req.body
    if (!branch_id) return error(res, 'branch_id is required')

    const { data: existing } = await supabase.from('users').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Staff member not found', 404)

    const { data: branch } = await supabase.from('branches').select('id').eq('id', branch_id).single()
    if (!branch) return error(res, 'Branch not found', 404)

    const { data: updated, error: dbError } = await supabase.from('users').update({ branch_id, updated_at: new Date() }).eq('id', id)
      .select('id, name, branch_id').single()

    if (dbError) return error(res, 'Could not reassign branch', 500)
    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'reassign_branch', entity_type: 'user', entity_id: id, old_value: { branch_id: existing.branch_id }, new_value: { branch_id } })
    return success(res, updated, 'Staff member reassigned')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body
    if (!newPassword) return error(res, 'newPassword is required')
    if (newPassword.length < 6) return error(res, 'Password must be at least 6 characters')

    const { data: user } = await supabase.from('users').select('id, branch_id').eq('id', id).single()
    if (!user) return error(res, 'Staff member not found', 404)
    if (req.user.role === 'admin' && user.branch_id !== req.user.branch_id) {
      return error(res, 'You can only reset passwords for staff in your own branch', 403)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    const { error: dbError } = await supabase.from('users').update({ password: hashedPassword, updated_at: new Date() }).eq('id', id)
    if (dbError) return error(res, 'Could not reset password', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'reset_password', entity_type: 'user', entity_id: id })
    return success(res, {}, 'Password reset successful')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router