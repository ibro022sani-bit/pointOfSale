import express from 'express'
import supabase from '../lib/supabase.js'
import { success, error } from '../lib/helpers.js'
import { requireAuth, requireRole } from '../lib/middleware.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('products').select('*').eq('is_active', true).order('name', { ascending: true })
    if (dbError) return error(res, 'Could not fetch products', 500)
    return success(res, data, 'Products fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/', requireRole('super_admin'), async (req, res) => {
  try {
    const { name, category, drug_type, unit_of_measurement, weight, brand, barcode, price, wholesale_price } = req.body
    if (!name || !category || !unit_of_measurement || price === undefined) {
      return error(res, 'name, category, unit_of_measurement and price are required')
    }

    const { data: product, error: dbError } = await supabase
      .from('products')
      .insert({ name, category, drug_type: drug_type || null, unit_of_measurement, weight: weight || null, brand: brand || null, barcode: barcode || null, price, wholesale_price: wholesale_price ?? null })
      .select().single()

    if (dbError) {
      if (dbError.code === '23505') return error(res, 'A product with this barcode already exists')
      return error(res, 'Could not create product', 500)
    }

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'create', entity_type: 'product', entity_id: product.id, new_value: product })
    return success(res, product, 'Product created')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/search', async (req, res) => {
  try {
    let { q, branch_id } = req.query
    if (!q) return error(res, 'Query parameter q is required')

    if (branch_id && req.user.role !== 'super_admin') branch_id = req.user.branch_id

    if (branch_id) {
      const { data: branchProducts, error: dbError } = await supabase
        .from('branch_products')
        .select('product_id, products(*)')
        .eq('branch_id', branch_id)
        .eq('is_active', true)

      if (dbError) return error(res, 'Search failed', 500)

      const lowerQ = q.toLowerCase()
      const filtered = (branchProducts || [])
        .filter(bp => bp.products?.is_active && bp.products.name.toLowerCase().includes(lowerQ))
        .slice(0, 50)

      const productIds = filtered.map(bp => bp.product_id)
      const { data: stockRows } = await supabase
        .from('stock')
        .select('product_id, quantity, low_stock_threshold')
        .eq('branch_id', branch_id)
        .in('product_id', productIds)

      const merged = filtered.map(bp => ({
        ...bp.products,
        stock: (stockRows || []).find(s => s.product_id === bp.product_id) || null
      }))

      return success(res, merged, 'Search results')
    }

    const { data, error: dbError } = await supabase
      .from('products').select('*').eq('is_active', true).ilike('name', `%${q}%`).order('name', { ascending: true }).limit(50)

    if (dbError) return error(res, 'Search failed', 500)
    return success(res, data, 'Search results')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase
      .from('products').select('*').eq('barcode', req.params.barcode).eq('is_active', true).single()

    if (dbError || !data) return error(res, 'Product not found', 404)
    return success(res, data, 'Product fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/branch/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params

    const { data: branchProducts, error: dbError } = await supabase
      .from('branch_products')
      .select('product_id, is_active, products(*)')
      .eq('branch_id', branchId)
      .eq('is_active', true)

    if (dbError) return error(res, 'Could not fetch branch products', 500)

    const productIds = branchProducts.map(bp => bp.product_id)
    const { data: stockRows } = await supabase
      .from('stock')
      .select('product_id, quantity, low_stock_threshold')
      .eq('branch_id', branchId)
      .in('product_id', productIds)

    const merged = branchProducts.map(bp => ({
      ...bp,
      stock: (stockRows || []).find(s => s.product_id === bp.product_id) || null
    }))

    return success(res, merged, 'Branch products fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { data, error: dbError } = await supabase.from('products').select('*').eq('id', req.params.id).single()
    if (dbError || !data) return error(res, 'Product not found', 404)
    return success(res, data, 'Product fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.put('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('products').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Product not found', 404)

    const allowed = ['name', 'category', 'drug_type', 'unit_of_measurement', 'weight', 'brand', 'barcode', 'price', 'wholesale_price', 'is_active']
    const updates = {}
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]
    if (updates.drug_type === '') updates.drug_type = null
    updates.updated_at = new Date()

    const { data: updated, error: dbError } = await supabase.from('products').update(updates).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not update product', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'update', entity_type: 'product', entity_id: id, old_value: existing, new_value: updated })
    return success(res, updated, 'Product updated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('products').select('*').eq('id', id).single()
    if (!existing) return error(res, 'Product not found', 404)

    const { data: updated, error: dbError } = await supabase.from('products').update({ is_active: false, updated_at: new Date() }).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not delete product', 500)

    await supabase.from('audit_logs').insert({ user_id: req.user.id, action: 'delete', entity_type: 'product', entity_id: id, old_value: existing })
    return success(res, updated, 'Product deactivated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

router.post('/:id/generate-barcode', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabase.from('products').select('id').eq('id', id).single()
    if (!existing) return error(res, 'Product not found', 404)

    function randomBarcode() {
      let code = '2'
      for (let i = 0; i < 11; i++) code += Math.floor(Math.random() * 10)
      return code
    }

    let barcode, attempts = 0
    while (attempts < 5) {
      barcode = randomBarcode()
      const { data: clash } = await supabase.from('products').select('id').eq('barcode', barcode).maybeSingle()
      if (!clash) break
      attempts++
    }

    const { data: updated, error: dbError } = await supabase.from('products').update({ barcode, updated_at: new Date() }).eq('id', id).select().single()
    if (dbError) return error(res, 'Could not generate barcode', 500)
    return success(res, updated, 'Barcode generated')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})
router.get('/:id/branches', async (req, res) => {
  try {
    const { id } = req.params

    const { data: product } = await supabase.from('products').select('id').eq('id', id).single()
    if (!product) return error(res, 'Product not found', 404)

    const { data: branchProducts, error: dbError } = await supabase
      .from('branch_products')
      .select('branch_id, is_active, branches(id, name, address)')
      .eq('product_id', id)
      .eq('is_active', true)

    if (dbError) return error(res, 'Could not fetch branches for this product', 500)

    const branchIds = branchProducts.map(bp => bp.branch_id)
    const { data: stockRows } = await supabase
      .from('stock')
      .select('branch_id, quantity, low_stock_threshold')
      .eq('product_id', id)
      .in('branch_id', branchIds)

    const merged = branchProducts.map(bp => ({
      ...bp,
      stock: (stockRows || []).find(s => s.branch_id === bp.branch_id) || null
    }))

    return success(res, merged, 'Branches fetched')
  } catch (err) {
    return error(res, 'Server error', 500)
  }
})

export default router