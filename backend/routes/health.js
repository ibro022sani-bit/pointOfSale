import express from 'express'
import supabase from '../lib/supabase.js'

const router = express.Router()

// For uptime monitors: confirms the server is running and the database answers
router.get('/', async (req, res) => {
  try {
    const { error } = await supabase.from('tenants').select('id').limit(1)
    if (error) return res.status(503).json({ ok: false })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(503).json({ ok: false })
  }
})

export default router