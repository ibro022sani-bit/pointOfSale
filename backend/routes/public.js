import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'

const router = express.Router()

router.get('/branches', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('branches')
      .select('id, name, phone, address')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (dbError) return error(res, 'Could not fetch branches', 500)
    return success(res, data, 'Branches fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router