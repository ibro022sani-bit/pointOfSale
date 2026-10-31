import express from 'express'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'
import { cleanName } from '../lib/catalog.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const [cats, units] = await Promise.all([
      req.db.from('product_categories').select('id, name, is_medicine').order('name'),
      req.db.from('product_units').select('id, name').order('name'),
    ])
    if (cats.error || units.error) return error(res, 'Could not fetch catalog', 500)
    return success(res, { categories: cats.data, units: units.data }, 'Catalog fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/categories', requireRole('super_admin'), async (req, res) => {
  try {
    const name = cleanName(req.body.name)
    if (!name) return error(res, 'Category name is required')
    const { data, error: dbError } = await req.db
      .from('product_categories')
      .insert({ name, is_medicine: !!req.body.is_medicine })
      .select('id, name, is_medicine')
      .single()
    if (dbError) {
      if (dbError.code === '23505') return error(res, 'That category already exists')
      return error(res, 'Could not add category', 500)
    }
    return success(res, data, 'Category added')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/categories/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await req.db
      .from('product_categories').select('id, name, is_medicine').eq('id', id).single()
    if (!existing) return error(res, 'Category not found', 404)

    const updates = {}
    if (req.body.name !== undefined) {
      const name = cleanName(req.body.name)
      if (!name) return error(res, 'Category name cannot be empty')
      updates.name = name
    }
    if (req.body.is_medicine !== undefined) updates.is_medicine = !!req.body.is_medicine
    if (Object.keys(updates).length === 0) return error(res, 'Nothing to update')

    const { data, error: dbError } = await req.db
      .from('product_categories').update(updates).eq('id', id)
      .select('id, name, is_medicine').single()
    if (dbError) {
      if (dbError.code === '23505') return error(res, 'That category already exists')
      return error(res, 'Could not update category', 500)
    }

    // Renaming: move the category's products to the new name
    if (updates.name && updates.name !== existing.name) {
      const { error: moveErr } = await req.db
        .from('products').update({ category: updates.name }).eq('category', existing.name)
      if (moveErr) {
        await req.db.from('product_categories').update({ name: existing.name }).eq('id', id)
        return error(res, 'Could not rename category', 500)
      }
    }

    // No longer a medicine category: clear drug types on its products
    if (updates.is_medicine === false && existing.is_medicine) {
      await req.db.from('products').update({ drug_type: null }).eq('category', data.name)
    }

    return success(res, data, 'Category updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/categories/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await req.db
      .from('product_categories').select('id, name').eq('id', id).single()
    if (!existing) return error(res, 'Category not found', 404)

    const { count } = await req.db
      .from('products').select('id', { count: 'exact', head: true })
      .eq('category', existing.name).eq('is_active', true)
    if (count > 0) {
      return error(res, `${count} product(s) still use "${existing.name}". Move or delete them first.`)
    }

    const { error: dbError } = await req.db.from('product_categories').delete().eq('id', id)
    if (dbError) return error(res, 'Could not delete category', 500)
    return success(res, null, 'Category deleted')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/units', requireRole('super_admin'), async (req, res) => {
  try {
    const name = cleanName(req.body.name).toLowerCase()
    if (!name) return error(res, 'Unit name is required')
    const { data, error: dbError } = await req.db
      .from('product_units').insert({ name }).select('id, name').single()
    if (dbError) {
      if (dbError.code === '23505') return error(res, 'That unit already exists')
      return error(res, 'Could not add unit', 500)
    }
    return success(res, data, 'Unit added')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/units/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await req.db
      .from('product_units').select('id, name').eq('id', id).single()
    if (!existing) return error(res, 'Unit not found', 404)

    const { count } = await req.db
      .from('products').select('id', { count: 'exact', head: true })
      .eq('unit_of_measurement', existing.name).eq('is_active', true)
    if (count > 0) {
      return error(res, `${count} product(s) still use "${existing.name}". Move or delete them first.`)
    }

    const { error: dbError } = await req.db.from('product_units').delete().eq('id', id)
    if (dbError) return error(res, 'Could not delete unit', 500)
    return success(res, null, 'Unit deleted')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router