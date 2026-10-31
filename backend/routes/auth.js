import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { rateLimit, rateLimitBody } from '../lib/rateLimit.js'
import { DEFAULT_CATEGORIES, DEFAULT_UNITS } from '../lib/catalogDefaults.js'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'

const router = express.Router()

router.post('/staff/login', rateLimit('login', 20, 900), rateLimitBody('login-email', 'email', 10, 900), async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return error(res, 'Email and password are required')

    const { data: user, error: dbError } = await supabase
      .from('users').select('*').eq('email', email.trim().toLowerCase()).eq('is_active', true).single()

    if (dbError || !user) return error(res, 'Invalid email or password', 401)

    const match = await bcrypt.compare(password, user.password)
    if (!match) return error(res, 'Invalid email or password', 401)

    if (user.role === 'platform_admin') {
      const adminToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' })
      return success(res, { token: adminToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 'Login successful')
    }

    const { data: tenant } = await supabase
      .from('tenants').select('id, name, slug, status, phone, address, receipt_footer').eq('id', user.tenant_id).single()
    if (!tenant) return error(res, 'Business account not found', 403)
    if (tenant.status !== 'active') {
      return error(res, tenant.status === 'pending' ? 'Your account is awaiting activation. Please contact support.' : 'This account has been deactivated. Please make payment to reactivate it.', 403)
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, branch_id: user.branch_id, tenant_id: user.tenant_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return success(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branch_id, tenant_id: user.tenant_id },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, phone: tenant.phone, address: tenant.address, receipt_footer: tenant.receipt_footer }
    }, 'Login successful')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/signup', rateLimit('signup', 5, 3600), async (req, res) => {
  let tenantId = null
  try {
    const { business_name, name, email, phone, password } = req.body
    if (!business_name?.trim() || !name?.trim() || !email?.trim() || !password) {
      return error(res, 'Business name, your name, email and password are required')
    }
    if (password.length < 8) return error(res, 'Password must be at least 8 characters')

    const cleanEmail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return error(res, 'Enter a valid email address')

    const { data: existing } = await supabase.from('users').select('id').eq('email', cleanEmail).maybeSingle()
    if (existing) return error(res, 'An account with this email already exists')

    const base = business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'business'
    const slug = `${base}-${crypto.randomBytes(2).toString('hex')}`

    // Created as PENDING: nobody can log in until the platform owner activates it
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({ name: business_name.trim(), slug, email: cleanEmail, phone: phone || null, plan: 'standard', status: 'pending' })
      .select().single()
    if (tenantErr) throw tenantErr
    tenantId = tenant.id

    const { data: branch, error: branchErr } = await supabase
      .from('branches').insert({ tenant_id: tenantId, name: 'Main Branch', is_main: true }).select().single()
    if (branchErr) throw branchErr

    // Starter categories and units so the new business can add products straight away
    const { error: catErr } = await supabase
      .from('product_categories').insert(DEFAULT_CATEGORIES.map((name) => ({ tenant_id: tenantId, name })))
    if (catErr) throw catErr
    const { error: unitErr } = await supabase
      .from('product_units').insert(DEFAULT_UNITS.map((name) => ({ tenant_id: tenantId, name })))
    if (unitErr) throw unitErr

    const hashedPassword = await bcrypt.hash(password, 10)
    const { error: userErr } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId, name: name.trim(), email: cleanEmail, phone: phone || null,
        password: hashedPassword, role: 'super_admin', branch_id: branch.id
      })
    if (userErr) throw userErr

    return success(res, { pending: true }, 'Account created. It will be activated after review.')
  } catch (err) {
    if (tenantId) {
      await supabase.from('product_categories').delete().eq('tenant_id', tenantId)
      await supabase.from('product_units').delete().eq('tenant_id', tenantId)
      await supabase.from('users').delete().eq('tenant_id', tenantId)
      await supabase.from('branches').delete().eq('tenant_id', tenantId)
      await supabase.from('tenants').delete().eq('id', tenantId)
    }
    return error(res, 'Could not create your account', 500)
  }
})

export default router