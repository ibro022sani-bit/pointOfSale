import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Package, GitBranch, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const [product, setProduct] = useState(null)
  const [branchProducts, setBranchProducts] = useState([])
  const [allBranches, setAllBranches] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [productRes, branchRes, branchProductRes, supplierRes] = await Promise.all([
        api.get(`/api/products/${id}`),
        api.get('/api/branches'),
        api.get(`/api/products/${id}/branches`),
        api.get('/api/suppliers'),
      ])
      if (productRes.data.success) setProduct(productRes.data.data)
      if (branchRes.data.success) setAllBranches(branchRes.data.data)
      if (branchProductRes.data.success) setBranchProducts(branchProductRes.data.data)
      if (supplierRes.data.success) setSuppliers(supplierRes.data.data)
    } catch {
      toast.error('Failed to load product details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleRemoveFromBranch = async (branchId) => {
    if (!confirm('Remove this product from the branch?')) return
    try {
      const res = await api.delete(`/api/branches/${branchId}/products/${id}`)
      if (res.data.success) {
        toast.success('Product removed from branch')
        fetchData()
      }
    } catch {
      toast.error('Failed to remove product from branch')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Product not found</p>
      </div>
    )
  }


  const assignedBranchIds = branchProducts.map((bp) => bp.branch_id)
  const unassignedBranches = allBranches.filter((b) => !assignedBranchIds.includes(b.id))
  // Admins can only assign this product to their own branch; super admin, any branch.
  const assignableBranches = isSuperAdmin
    ? unassignedBranches
    : unassignedBranches.filter((b) => b.id === user?.branch_id)

  return (
    <div className="space-y-4">

      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/products')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft size={16} />
        Back to Products
      </button>

      {/* Product Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
              <Package size={24} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium px-2 py-1 rounded-lg bg-green-100 text-green-700 capitalize">
                  {product.category}
                </span>
                {product.drug_type && (
                  <span className="text-xs font-medium px-2 py-1 rounded-lg bg-blue-100 text-blue-700 capitalize">
                    {product.drug_type}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              ₦{Number(product.price).toLocaleString()}
            </p>
            {product.wholesale_price && (
              <p className="text-xs text-orange-500 font-medium mt-0.5">
                Wholesale: ₦{Number(product.wholesale_price).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-1">Unit</p>
            <p className="text-sm font-medium text-gray-700">{product.unit_of_measurement}</p>
          </div>
          {product.weight && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Size</p>
              <p className="text-sm font-medium text-gray-700">{product.weight}</p>
            </div>
          )}
          {product.brand && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Brand</p>
              <p className="text-sm font-medium text-gray-700">{product.brand}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-1">Barcode</p>
            <p className="text-sm font-medium text-gray-700">{product.barcode || 'None'}</p>
          </div>
        </div>
      </div>

      {/* Branch Assignment */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-700">Branch Stock</h2>
          </div>
          {assignableBranches.length > 0 && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition"
            >
              <Plus size={14} />
              Assign to Branch
            </button>
          )}
        </div>

        {branchProducts.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Not assigned to any branch yet</p>
            <p className="text-gray-300 text-sm mt-1">
              Click "Assign to Branch" to add stock
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {branchProducts.map((bp) => {
              const quantity = bp.stock?.quantity ?? 0
              const threshold = bp.stock?.low_stock_threshold ?? 0
              const isLow = quantity <= threshold
              const notStocked = bp.stock === null

              return (
                <div key={bp.branch_id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
                      <GitBranch size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{bp.branches?.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {notStocked ? (
                          <span className="text-xs text-gray-400">Not stocked yet</span>
                        ) : isLow ? (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <AlertTriangle size={10} />
                            Low stock — {quantity} {product.unit_of_measurement} left
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {quantity} {product.unit_of_measurement} in stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(isSuperAdmin || bp.branch_id === user?.branch_id) && (
                    <button
                      onClick={() => handleRemoveFromBranch(bp.branch_id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign to Branch Modal */}
      {showAssignModal && (
        <AssignBranchModal
          productId={id}
          product={product}
          branches={assignableBranches}
          suppliers={suppliers}
          onClose={() => setShowAssignModal(false)}
          onSaved={() => {
            setShowAssignModal(false)
            fetchData()
          }}
        />
      )}

    </div>
  )
}

function AssignBranchModal({ productId, product, branches, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({
    branch_id: branches[0]?.id || '',
    initial_stock: '',
    low_stock_threshold: '10',
    cost_price: '',
    supplier_id: '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.branch_id) {
      toast.error('Please select a branch')
      return
    }
    if (!form.initial_stock) {
      toast.error('Please enter initial stock quantity')
      return
    }
    setSaving(true)
    try {
      const payload = {
        product_id: productId,
        initial_stock: Number(form.initial_stock),
        low_stock_threshold: Number(form.low_stock_threshold),
      }
      if (form.cost_price) {
        payload.cost_price = Number(form.cost_price)
      }
      if (form.supplier_id) {
        payload.supplier_id = form.supplier_id
      }

      const res = await api.post(`/api/branches/${form.branch_id}/products`, payload)
      if (res.data.success) {
        toast.success('Product assigned to branch!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign product to branch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Assign to Branch</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Current pricing — read only reference */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Retail Price</p>
            <p className="text-sm font-semibold text-gray-800">₦{Number(product.price).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Wholesale Price</p>
            <p className="text-sm font-semibold text-gray-800">
              {product.wholesale_price ? `₦${Number(product.wholesale_price).toLocaleString()}` : '—'}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-3 mb-4">
          Pricing is set on the product itself and applies to every branch. Edit it from the Products screen.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Branch *
            </label>
            <select
              name="branch_id"
              value={form.branch_id}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.is_main ? '(Main)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Initial Stock Quantity *
            </label>
            <input
              name="initial_stock"
              type="number"
              value={form.initial_stock}
              onChange={handleChange}
              placeholder="e.g. 50"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              How many units are currently in this branch
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Low Stock Alert Threshold
            </label>
            <input
              name="low_stock_threshold"
              type="number"
              value={form.low_stock_threshold}
              onChange={handleChange}
              placeholder="e.g. 10"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Alert when stock falls below this number
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Cost Price (₦ per unit)
            </label>
            <input
              name="cost_price"
              type="number"
              value={form.cost_price}
              onChange={handleChange}
              placeholder="What you paid per unit (optional)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave blank if unknown.  — recommended to fill in if you have it.
            </p>
          </div>

          {form.cost_price && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Supplier
              </label>
              <select
                name="supplier_id"
                value={form.supplier_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select supplier (optional)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

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
              {saving ? 'Assigning...' : 'Assign'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default ProductDetail