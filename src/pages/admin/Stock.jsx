import { useState, useEffect } from 'react'
import { Plus, ArrowLeftRight, AlertTriangle, Package, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

function Stock() {
  const [stock, setStock] = useState([])
  const [branches, setBranches] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [activeTab, setActiveTab] = useState('stock')
  const { user, defaultBranchId } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const fetchData = async (branchId) => {
    setLoading(true)
    try {
      const [branchRes, supplierRes] = await Promise.all([
        api.get('/api/branches'),
        api.get('/api/suppliers'),
      ])
      if (branchRes.data.success) {
        setBranches(branchRes.data.data)

        // Super admin: use passed branch, else their saved default, else first branch.
        // Admin/cashier: always their own assigned branch — never anything else.
        const targetBranch = isSuperAdmin
          ? (branchId || defaultBranchId || branchRes.data.data[0]?.id)
          : user?.branch_id

        setSelectedBranch(targetBranch)
        if (targetBranch) {
          const stockRes = await api.get(`/api/stock/branch/${targetBranch}`)
          if (stockRes.data.success) setStock(stockRes.data.data)
        }
      }
      if (supplierRes.data.success) setSuppliers(supplierRes.data.data)
    } catch {
      toast.error('Failed to load stock')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleBranchChange = async (branchId) => {
    setSelectedBranch(branchId)
    setLoading(true)
    try {
      const res = await api.get(`/api/stock/branch/${branchId}`)
      if (res.data.success) setStock(res.data.data)
    } catch {
      toast.error('Failed to load stock')
    } finally {
      setLoading(false)
    }
  }

  const lowStockItems = stock.filter(
    (s) => s.quantity <= s.low_stock_threshold
  )

  const tabs = [
    { id: 'stock', label: 'Current Stock' },
    { id: 'low', label: `Low Stock (${lowStockItems.length})` },
  ]

  const displayStock = activeTab === 'low' ? lowStockItems : stock

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Stock Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stock.length} products tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <ArrowLeftRight size={16} />
            Transfer Stock
          </button>
          <button
            onClick={() => setShowRestockModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Restock
          </button>
        </div>
      </div>

      {/* Branch Selector — super_admin only */}
      {isSuperAdmin && branches.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            View Stock For Branch
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.is_main ? '(Main)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayStock.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              {activeTab === 'low' ? 'No low stock items' : 'No stock found for this branch'}
            </p>
            <p className="text-gray-300 text-sm mt-1">
              {activeTab === 'stock' && 'Assign products to this branch first'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">In Stock</th>
                  <th className="text-left px-5 py-3">Alert At</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayStock.map((item) => {
                  const isLow = item.quantity <= item.low_stock_threshold
                  return (
                    <tr key={item.product_id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">
                          {item.products?.name || 'Unknown Product'}
                        </p>
                        {item.products?.brand && (
                          <p className="text-xs text-gray-400">{item.products.brand}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-gray-100 text-gray-600 capitalize">
                          {item.products?.category || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-800">
                        {item.quantity} {item.products?.unit_of_measurement}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {item.low_stock_threshold} {item.products?.unit_of_measurement}
                      </td>
                      <td className="px-5 py-3">
                        {isLow ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                            <AlertTriangle size={12} />
                            Low Stock
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600">OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Modal */}
      {showRestockModal && (
        <RestockModal
          branches={branches}
          suppliers={suppliers}
          defaultBranchId={selectedBranch}
          isSuperAdmin={isSuperAdmin}
          userBranchId={user?.branch_id}
          onClose={() => setShowRestockModal(false)}
          onSaved={() => {
            setShowRestockModal(false)
            fetchData(selectedBranch)
            toast.success('Stock updated!')
          }}
        />
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          branches={branches}
          defaultFromBranchId={selectedBranch}
          isSuperAdmin={isSuperAdmin}
          userBranchId={user?.branch_id}
          onClose={() => setShowTransferModal(false)}
          onSaved={() => {
            setShowTransferModal(false)
            fetchData(selectedBranch)
            toast.success('Transfer initiated!')
          }}
        />
      )}

    </div>
  )
}

function RestockModal({ branches, suppliers, defaultBranchId, isSuperAdmin, userBranchId, onClose, onSaved }) {
  const [form, setForm] = useState({
    branch_id: isSuperAdmin ? (defaultBranchId || '') : (userBranchId || ''),
    supplier_id: '',
    notes: '',
    amount_paid_now: '',
    payment_method_now: 'cash',
  })
  const [items, setItems] = useState([{ product_id: '', quantity: '', cost_price: '' }])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (form.branch_id) {
      api.get(`/api/products/branch/${form.branch_id}`).then((res) => {
        if (res.data.success) setProducts(res.data.data)
      })
    }
  }, [form.branch_id])

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: '', cost_price: '' }])
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index, field, value) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.branch_id) return toast.error('Select a branch')
    if (items.some((i) => !i.product_id || !i.quantity || !i.cost_price)) {
      return toast.error('Fill all item fields')
    }
    const total_cost = items.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.cost_price), 0
    )
    if (form.amount_paid_now && Number(form.amount_paid_now) > total_cost) {
      return toast.error('Amount paid now cannot exceed the total cost')
    }
    setSaving(true)
    try {
      const payload = {
        branch_id: form.branch_id,
        supplier_id: form.supplier_id || null,
        notes: form.notes,
        total_cost,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
          cost_price: Number(i.cost_price),
        })),
      }
      if (form.amount_paid_now) {
        payload.amount_paid_now = Number(form.amount_paid_now)
        payload.payment_method_now = form.payment_method_now
      }

      const res = await api.post('/api/stock/restock', payload)
      if (res.data.success) onSaved()
      else toast.error(res.data.message || 'Failed to restock')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Restock Products</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {isSuperAdmin ? (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Branch *</label>
              <select
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Branch</label>
              <input
                value={branches.find((b) => b.id === form.branch_id)?.name || 'Your branch'}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Supplier</label>
            <select
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select supplier (optional)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Products *</label>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.products?.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                      <input
                        type="number"
                        placeholder="Cost price (₦)"
                        value={item.cost_price}
                        onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition mt-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              <Plus size={14} />
              Add another product
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about this restock..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Amount Paying Supplier Now (₦)
            </label>
            <input
              type="number"
              value={form.amount_paid_now}
              onChange={(e) => setForm({ ...form, amount_paid_now: e.target.value })}
              placeholder="Leave blank if paying nothing now"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Whatever's left of the total cost stays owed to the supplier
            </p>
          </div>

          {form.amount_paid_now && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Paying Via</label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'transfer', 'pos'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, payment_method_now: m })}
                    className={`py-2 rounded-xl border-2 text-xs font-semibold capitalize transition ${
                      form.payment_method_now === m
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
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
              {saving ? 'Saving...' : 'Confirm Restock'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function TransferModal({ branches, defaultFromBranchId, isSuperAdmin, userBranchId, onClose, onSaved }) {
  const [form, setForm] = useState({
    from_branch_id: isSuperAdmin ? (defaultFromBranchId || '') : (userBranchId || ''),
    to_branch_id: '',
    notes: '',
  })
  const [items, setItems] = useState([{ product_id: '', quantity: '' }])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (form.from_branch_id) {
      api.get(`/api/products/branch/${form.from_branch_id}`).then((res) => {
        if (res.data.success) setProducts(res.data.data)
      })
    }
  }, [form.from_branch_id])

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: '' }])
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index, field, value) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.from_branch_id || !form.to_branch_id) {
      return toast.error('Select both branches')
    }
    if (form.from_branch_id === form.to_branch_id) {
      return toast.error('Cannot transfer to same branch')
    }
    if (items.some((i) => !i.product_id || !i.quantity)) {
      return toast.error('Fill all item fields')
    }
    setSaving(true)
    try {
      const res = await api.post('/api/stock/transfer', {
        from_branch_id: form.from_branch_id,
        to_branch_id: form.to_branch_id,
        notes: form.notes,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
        })),
      })
      if (res.data.success) onSaved()
      else toast.error(res.data.message || 'Failed to transfer')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer stock')
    } finally {
      setSaving(false)
    }
  }

  const toBranches = branches.filter((b) => b.id !== form.from_branch_id)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Transfer Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {isSuperAdmin ? (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">From Branch *</label>
              <select
                value={form.from_branch_id}
                onChange={(e) => setForm({ ...form, from_branch_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">From Branch</label>
              <input
                value={branches.find((b) => b.id === form.from_branch_id)?.name || 'Your branch'}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">To Branch *</label>
            <select
              value={form.to_branch_id}
              onChange={(e) => setForm({ ...form, to_branch_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select branch</option>
              {toBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Products *</label>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={item.product_id}
                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.products?.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              <Plus size={14} />
              Add another product
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any notes about this transfer..."
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

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
              {saving ? 'Transferring...' : 'Initiate Transfer'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Stock