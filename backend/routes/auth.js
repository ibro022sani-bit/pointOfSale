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

    const token = jwt.sign({ id: user.id, role: user.role, branch_id: user.branch_id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    return success(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branch_id }
    }, 'Login successful')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/customer/register', async (req, res) => {
  try {
    const { name, phone, email, password, address } = req.body
    if (!name || !phone || !password) return error(res, 'Name, phone and password are required')
    if (password.length < 6) return error(res, 'Password must be at least 6 characters')

    const { data: existing } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle()
    const hashedPassword = await bcrypt.hash(password, 10)

    let customer
    if (existing) {
      if (existing.password) {
        return error(res, 'An account with this phone number already exists. Please log in instead.')
      }
      const { data: linked, error: dbError } = await supabase
        .from('customers')
        .update({ password: hashedPassword, name: name || existing.name, email: email || existing.email, address: address || existing.address })
        .eq('id', existing.id)
        .select().single()
      if (dbError) return error(res, 'Could not link account', 500)
      customer = linked
    } else {
      const { data: created, error: dbError } = await supabase
        .from('customers')
        .insert({ name, phone, email: email || null, password: hashedPassword, address: address || null })
        .select().single()
      if (dbError) return error(res, 'Could not create account', 500)
      customer = created
    }

    const token = jwt.sign({ id: customer.id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' })

    return success(res, {
      token,
      user: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, role: 'customer' }
    }, existing ? 'Account linked, login successful' : 'Registration successful')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.post('/customer/login', async (req, res) => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) return error(res, 'Phone and password are required')

    const { data: customer, error: dbError } = await supabase.from('customers').select('*').eq('phone', phone).single()
    if (dbError || !customer || !customer.password) return error(res, 'Invalid phone or password', 401)

    const match = await bcrypt.compare(password, customer.password)
    if (!match) return error(res, 'Invalid phone or password', 401)

    const token = jwt.sign({ id: customer.id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' })

    return success(res, {
      token,
      user: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, role: 'customer' }
    }, 'Login successful')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
    

export default router