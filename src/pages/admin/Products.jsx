import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import AddInline from '../../components/common/AddInline'

const DRUG_TYPES = ['injection', 'powder', 'bolus', 'suspension', 'vaccine', 'syringe', 'tablet', 'capsule', 'syrup', 'cream', 'ointment', 'drops']

const categoryColors = {
  drug: 'bg-red-100 text-red-700',
  feed: 'bg-green-100 text-green-700',
  accessory: 'bg-blue-100 text-blue-700',
}

const PALETTE = [
  'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700', 'bg-indigo-100 text-indigo-700', 'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700', 'bg-lime-100 text-lime-700',
]
// Keeps the original colors for drug/feed/accessory; gives every other category a stable color
const colorFor = (name) => {
  const key = (name || '').toLowerCase()
  if (categoryColors[key]) return categoryColors[key]
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/products')
      if (res.data.success) setProducts(res.data.data)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (!categoryFilter || p.category === categoryFilter)
  )

  const categoryOptions = [...new Set(products.map((p) => p.category).filter(Boolean))].sort()

  const handleEdit = (product) => {
    setEditing(product)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      const res = await api.delete(`/api/products/${id}`)
      if (res.data.success) {
        toast.success('Product deleted')
        fetchProducts()
      }
    } catch {
      toast.error('Failed to delete product')
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} products registered</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Add Product
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
          />
        </div>
      </div>

      {categoryOptions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {['', ...categoryOptions].map((c) => (
            <button
              key={c || 'all'}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition ${
                categoryFilter === c
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {c || 'All'}
            </button>
          ))}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No products found</p>
            <p className="text-gray-300 text-sm mt-1">Click "Add Product" to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3">Product Name</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">Unit</th>
                  <th className="text-left px-5 py-3">Retail Price</th>
                  <th className="text-left px-5 py-3">Wholesale Price</th>
                  <th className="text-left px-5 py-3">Barcode</th>
                  <th className="text-left px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} onClick={() => navigate(`/admin/products/${product.id}`)} className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{product.name}</p>
                      {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${colorFor(product.category)}`}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{product.unit_of_measurement}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">
                      ₦{Number(product.price).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {product.wholesale_price ? `₦${Number(product.wholesale_price).toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {product.barcode || 'No barcode'}
                    </td>
                    <td className="px-5 py-3">
                      {isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(product) }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(product.id) }}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ProductModal
          product={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchProducts()
          }}
        />
      )}
    </div>
  )
}

function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
  name: product?.name || '',
  category: product?.category || '',
  drug_type: product?.drug_type || '',
  unit_of_measurement: product?.unit_of_measurement || '',
  weight: product?.weight || '',
  brand: product?.brand || '',
  barcode: product?.barcode || '',
  price: product?.price || '',
  wholesale_price: product?.wholesale_price || '',
})
  const [saving, setSaving] = useState(false)
  const [catalog, setCatalog] = useState({ categories: [], units: [] })

  useEffect(() => {
    api.get('/api/catalog')
      .then((res) => setCatalog(res.data.data))
      .catch(() => toast.error('Could not load categories'))
  }, [])

  const CATEGORIES = catalog.categories.map((c) => c.name)
  const UNITS = catalog.units.map((u) => u.name)
  const isMedicine = !!catalog.categories.find((c) => c.name === form.category)?.is_medicine

  const addCatalogItem = async (kind, name) => {
    try {
      const res = await api.post(`/api/catalog/${kind}`, { name })
      const created = res.data.data
      setCatalog((c) => ({ ...c, [kind]: [...c[kind], created] }))
      return created.name
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add')
      return null
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.unit_of_measurement || !form.category) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
        drug_type: form.drug_type || null,
        brand: form.brand || null,
        weight: form.weight || null,
        barcode: form.barcode || null,
      }

      const res = product
        ? await api.put(`/api/products/${product.id}`, payload)
        : await api.post('/api/products', payload)

      if (res.data.success) {
        toast.success(product ? 'Product updated!' : 'Product added!')
        onSaved()
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save product'
      toast.error(message)
      console.error('Product save error:', err.response?.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Product Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Oxytetracycline Injection"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>

          <AddInline
            label="category"
            onAdd={(n) => addCatalogItem('categories', n)}
            onAdded={(n) => setForm((f) => ({ ...f, category: n }))}
          />

          {/* Drug type (only for medicine categories) */}
          {isMedicine && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Drug Type *
              </label>
              <select
                name="drug_type"
                value={form.drug_type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select drug type</option>
                {DRUG_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Unit of Measurement *
            </label>
            <select
              name="unit_of_measurement"
              value={form.unit_of_measurement}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select unit</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <AddInline
            label="unit"
            onAdd={(n) => addCatalogItem('units', n)}
            onAdded={(n) => setForm((f) => ({ ...f, unit_of_measurement: n }))}
          />

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Brand / Company
            </label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              placeholder="e.g. Cargill, Amo Byng"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Weight / Size
            </label>
            <input
              name="weight"
              value={form.weight}
              onChange={handleChange}
              placeholder="e.g. 25kg, 100ml, 250g"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p className="text-xs text-gray-400 mt-1">
                Numbers only — unit is already selected above
            </p>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Retail Price (₦) *
              </label>
              <input
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                placeholder="e.g. 5000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Wholesale Price (₦)
              </label>
              <input
                name="wholesale_price"
                type="number"
                value={form.wholesale_price}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Barcode (optional)
            </label>
            <input
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              placeholder="Scan or enter barcode"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : product ? 'Update Product' : 'Add Product'
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Products