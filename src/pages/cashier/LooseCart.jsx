import { useState, useEffect } from 'react'
import { Plus, Package, X, ShoppingBag, Lock, GitBranch } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useBranchStore from '../../store/branchStore'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { cacheOpenCart, getCachedCart, queueCartItem, queueCartClose, searchLocalProducts } from '../../services/offlineSync'

function LooseCart() {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const { user, defaultBranchId } = useAuthStore()
  const branches = useBranchStore((state) => state.branches)
  const isSuperAdmin = user?.role === 'super_admin'
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const { online } = useOnlineStatus()

  // Resolve which branch's cart we're working with.
  // Cashier/admin: always their own fixed branch — never changes.
  // Super admin: their saved default branch, falling back to whichever
  // branch is flagged as main, so there's always a sensible starting point
  // even if they've never set a default.
  useEffect(() => {
    if (isSuperAdmin && !selectedBranchId) {
      const fallback = defaultBranchId || branches.find((b) => b.is_main)?.id || branches[0]?.id || ''
      if (fallback) setSelectedBranchId(fallback)
    }
  }, [isSuperAdmin, branches, defaultBranchId])

  const branchId = isSuperAdmin ? selectedBranchId : user?.branch_id
  const branchName = branches.find((b) => b.id === branchId)?.name

  const fetchOpenCart = async () => {
    if (!branchId) return
    setLoading(true)
    try {
      if (!online) {
        const cached = await getCachedCart(branchId)
        setCart(cached)
        return
      }
      const res = await api.get('/api/carts/open', { params: { branch_id: branchId } })
      if (res.data.success) {
        setCart(res.data.data)
        if (res.data.data) await cacheOpenCart(branchId, res.data.data)
      }
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOpenCart() }, [online, branchId])

  const openNewCart = async () => {
  try {
    const res = await api.post('/api/carts', { branch_id: branchId })
    if (res.data.success) {
      setCart(res.data.data)
      toast.success('Cart opened!')
    }
  } catch (err) {
    const message = err.response?.data?.message || 'Failed to open cart'
    toast.error(message)
    fetchOpenCart() // refresh in case a cart already exists
  }
}

  return (
    <div className="space-y-4">

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Loose Cart</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sell bulk stock as individual pieces</p>
        </div>
        {branchName && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
            <GitBranch size={14} />
            Cart for: {branchName}
          </div>
        )}
      </div>

      {/* Branch Selector — super admin only */}
      {isSuperAdmin && branches.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Open Cart For Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.is_main ? '(Main)' : ''} {b.id === defaultBranchId ? '★ Default' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            If a cart is already open for this branch, it loads automatically below.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !cart ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <ShoppingBag size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-4">No open cart</p>
          {online ? (
            branchId ? (
              <button
                onClick={openNewCart}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                Open New Cart
              </button>
            ) : (
              <p className="text-xs text-gray-400">Select a branch above first</p>
            )
          ) : (
            <p className="text-xs text-gray-400">
              Opening a new cart needs an internet connection — reconnect first
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Cart opened {new Date(cart.opened_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p className="text-xs text-gray-400">{cart.cart_items?.length || 0} items in cart</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-green-100 transition"
              >
                <Plus size={15} /> Add Item
              </button>
              <button
                onClick={() => setShowClose(true)}
                className="flex items-center gap-1.5 bg-red-50 text-red-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-red-100 transition"
              >
                <Lock size={15} /> Close Cart
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {(!cart.cart_items || cart.cart_items.length === 0) ? (
              <div className="p-10 text-center">
                <Package size={40} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No items added yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Initial Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.cart_items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-800">{item.products?.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.initial_quantity} {item.products?.unit_of_measurement}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ₦{Number(item.unit_price).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showAddItem && cart && (
        <AddItemModal
          cartId={cart.id}
          branchId={branchId}
          online={online}
          onClose={() => setShowAddItem(false)}
          onAdded={() => {
            setShowAddItem(false)
            fetchOpenCart()
          }}
        />
      )}

      {showClose && cart && (
        <CloseCartModal
          cart={cart}
          online={online}
          onClose={() => setShowClose(false)}
          onClosed={() => {
            setShowClose(false)
            setCart(null)
          }}
        />
      )}

    </div>
  )
}

function AddItemModal({ cartId, branchId, online, onClose, onAdded }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (search.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      try {
        if (online) {
          const res = await api.get('/api/products/search', { params: { q: search, branch_id: branchId } })
          if (res.data.success) setResults(res.data.data)
        } else {
          const results = await searchLocalProducts(search, branchId)
          setResults(results)
        }
      } catch {
        // silent
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, branchId, online])

  const pickProduct = (product) => {
    setSelected(product)
    setUnitPrice(product.price || '')
    setResults([])
    setSearch(product.name)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected || !quantity || !unitPrice) {
      toast.error('Select a product, quantity and unit price')
      return
    }
    setSaving(true)
    try {
      const itemPayload = {
        product_id: selected.id,
        initial_quantity: Number(quantity),
        unit_price: Number(unitPrice),
      }

      if (!online) {
        await queueCartItem(cartId, itemPayload)
        toast.success('Item queued — will sync once reconnected')
        onAdded()
        return
      }

      const res = await api.post(`/api/carts/${cartId}/items`, itemPayload)
      if (res.data.success) {
        toast.success('Item added to cart!')
        onAdded()
      }
    } catch {
      toast.error('Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Add Item to Cart</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="relative">
            <label className="block text-sm font-medium text-gray-600 mb-1">Product</label>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
              placeholder="Search product name"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {results.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
                {results.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => pickProduct(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition"
                  >
                    {p.name} <span className="text-gray-400">· ₦{Number(p.price).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Initial Quantity Taken</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Unit Price (₦)</label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
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
              {saving ? 'Adding...' : 'Add Item'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function CloseCartModal({ cart, online, onClose, onClosed }) {
  const [remaining, setRemaining] = useState(
    Object.fromEntries((cart.cart_items || []).map((item) => [item.id, '']))
  )
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [saving, setSaving] = useState(false)

  const methods = ['cash', 'transfer', 'pos', 'credit']

  const handleChange = (itemId, value) => {
    setRemaining({ ...remaining, [itemId]: value })
  }

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/api/customers/search', { params: { q: customerSearch } })
        if (res.data.success) setCustomerResults(res.data.data)
      } catch {
        // silent
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!online && (paymentMethod === 'credit')) {
      toast.error('Credit closes need a live connection — pick cash, transfer or pos instead')
      return
    }

    if (paymentMethod === 'credit' && !selectedCustomer) {
      toast.error('Select a customer for credit sales')
      return
    }

    const items = cart.cart_items.map((item) => ({
      cart_item_id: item.id,
      remaining_quantity: Number(remaining[item.id] || 0),
    }))

    const invalid = items.some((i, idx) => i.remaining_quantity > cart.cart_items[idx].initial_quantity)
    if (invalid) {
      toast.error('Remaining quantity cannot exceed initial quantity')
      return
    }

    setSaving(true)
    try {
      const payload = {
        payment_method: paymentMethod,
        items,
      }
      if (paymentMethod === 'credit') {
        payload.customer_id = selectedCustomer.id
      }

      if (!online) {
        await queueCartClose(cart.id, payload)
        toast.success('Cart close saved offline — will sync once reconnected')
        onClosed()
        return
      }

      const res = await api.put(`/api/carts/${cart.id}/close`, payload)
      if (res.data.success) {
        toast.success('Cart closed and sale recorded!')
        onClosed()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close cart')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Close Cart</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Enter what's left of each item. The system will calculate what was sold.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {cart.cart_items?.map((item) => (
            <div key={item.id}>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {item.products?.name}
                <span className="text-gray-400 font-normal"> — took {item.initial_quantity}</span>
              </label>
              <input
                type="number"
                value={remaining[item.id]}
                onChange={(e) => handleChange(item.id, e.target.value)}
                placeholder="Remaining quantity"
                max={item.initial_quantity}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          ))}

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {methods.map((m) => {
                const disabled = !online && m === 'credit'
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded-xl border-2 text-xs font-semibold capitalize transition ${
                      disabled ? 'opacity-40 cursor-not-allowed border-gray-100 text-gray-300' :
                      paymentMethod === m
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>

          {paymentMethod === 'credit' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Customer *</label>
              {selectedCustomer ? (
                <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search name or phone"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  {customerResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerResults([]) }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition"
                        >
                          <p className="font-medium text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Closing...' : 'Close Cart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LooseCart