import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'

const router = express.Router()

router.post('/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return error(res, 'Email and password are required')

    const { data: user, error: dbError } = await supabase
      .from('users').select('*').eq('email', email).eq('is_active', true).single()

    if (dbError || !user) return error(res, 'Invalid email or password', 401)

    const match = await bcrypt.compare(password, user.password)
    if (!match) return error(res, 'Invalid email or password', 401)

    const { data: tenant } = await supabase
      .from('tenants').select('id, name, slug, status').eq('id', user.tenant_id).single()
    if (!tenant) return error(res, 'Business account not found', 403)
    if (['suspended', 'cancelled'].includes(tenant.status)) {
      return error(res, 'This business account is suspended. Please contact support.', 403)
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, branch_id: user.branch_id, tenant_id: user.tenant_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return success(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branch_id, tenant_id: user.tenant_id },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
    }, 'Login successful')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router