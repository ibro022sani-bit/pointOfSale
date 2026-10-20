import { useState, useRef, useEffect } from 'react'
import { Search, Trash2, Plus, Minus, ShoppingCart, X, User, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { searchProducts } from '../../services/productService'
import { createSale, confirmCashPayment, confirmTransferPayment, confirmPOSPayment, confirmDepositPayment } from '../../services/salesService'
import { getBranches } from '../../services/branchService'
import Receipt from '../../components/pos/Receipt'
import useAuthStore from '../../store/authStore'
import api from '../../services/api'
import useBranchStore from '../../store/branchStore'
import { WifiOff, Clock } from 'lucide-react'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { refreshBranchCache, searchLocalProducts, queueOfflineSale } from '../../services/offlineSync'
import PendingSalesPanel from '../../components/pos/PendingSalesPanel'

function POS() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [searching, setSearching] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [isWholesale, setIsWholesale] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const searchRef = useRef(null)
  const { user, defaultBranchId } = useAuthStore()
  const { online, pendingCount, refreshPendingCount } = useOnlineStatus()
  const [showPendingSales, setShowPendingSales] = useState(false)

  const isSuperAdmin = user?.role === 'super_admin'
  const activeBranchId = isSuperAdmin ? selectedBranchId : user?.branch_id

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    if (isSuperAdmin) {
      getBranches().then((res) => {
        if (res.success) {
          setBranches(res.data)
          if (defaultBranchId) {
            setSelectedBranchId(defaultBranchId)
          } else if (res.data.length > 0) {
            setSelectedBranchId(res.data[0].id)
          }
        }
      })
    }
  }, [])
    useEffect(() => {
    if (!activeBranchId || !online) return

    refreshBranchCache(activeBranchId)

    // Keep the offline cache fresh even if the cashier stays on this
    // screen for hours without navigating away or losing connection.
    const interval = setInterval(() => {
      refreshBranchCache(activeBranchId)
    }, 60000) // every 60 seconds

    return () => clearInterval(interval)
  }, [activeBranchId, online])

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length < 2) {
        setSearchResults([])
        return
      }
      if (!activeBranchId) {
        setSearchResults([])
        return
      }
      setSearching(true)
      try {
        if (online) {
          const res = await searchProducts(query, activeBranchId)
          if (res.success) setSearchResults(res.data)
        } else {
          const results = await searchLocalProducts(query, activeBranchId)
          setSearchResults(results)
        }
      } catch {
        toast.error('Search failed')
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, activeBranchId, online])

  const getItemPrice = (product) => {
    if (isWholesale && product.wholesale_price) {
      return Number(product.wholesale_price)
    }
    return Number(product.price)
  }

  const addToCart = (product) => {
    setQuery('')
    setSearchResults([])
    const existing = cartItems.find((i) => i.id === product.id)
    if (existing) {
      setCartItems(cartItems.map((i) =>
        i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ))
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }])
    }
    searchRef.current?.focus()
  }

  const updateQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id)
    setCartItems(cartItems.map((i) => i.id === id ? { ...i, quantity: qty } : i))
  }

  const setQtyInput = (id, rawValue) => {
    setCartItems(cartItems.map((i) => i.id === id ? { ...i, quantity: rawValue } : i))
  }

  const removeFromCart = (id) => {
    setCartItems(cartItems.filter((i) => i.id !== id))
  }

  const hasInvalidQty = cartItems.some((i) => !(Number(i.quantity) > 0))

  const total = cartItems.reduce((sum, i) => sum + getItemPrice(i) * (Number(i.quantity) || 0), 0)

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">

      {!online && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-40 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <WifiOff size={14} />
          Offline — Cash/Transfer/POS sales will sync automatically once reconnected
        </div>
      )}

      {pendingCount > 0 && (
        <button
          onClick={() => setShowPendingSales(true)}
          className="fixed top-2 right-4 z-40 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg flex items-center gap-2 transition"
        >
          <Clock size={14} />
          {pendingCount} Pending Sync
        </button>
      )}

      {/* Left — Search & Results */}
      <div className="flex-1 space-y-4">

        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">

          {/* Branch Selector — only for super admin */}
          {isSuperAdmin && branches.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Selling From Branch
              </label>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.is_main ? ' (Main)' : ''}
                    {branch.id === defaultBranchId ? ' ★ Default' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Change your default branch from the Branches screen
              </p>
            </div>
          )}

          {/* Wholesale Toggle */}
          <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Wholesale Pricing</p>
              <p className="text-xs text-gray-400">Applies to entire sale</p>
            </div>
            <button
              type="button"
              onClick={() => setIsWholesale(!isWholesale)}
              className={`relative w-12 h-6 rounded-full transition ${isWholesale ? 'bg-orange-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isWholesale ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <label className="block text-sm font-medium text-gray-600 mb-2">
            Search Product or Scan Barcode
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type product name or scan barcode..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {searchResults.map((product) => {
                const isLow = product.stock?.quantity != null && product.stock.quantity <= product.stock.low_stock_threshold
                const outOfStock = product.stock?.quantity === 0
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={`w-full flex items-center justify-between px-4 py-3 transition border-b border-gray-50 last:border-0 text-left ${
                      outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-400">
                        {product.category} • {product.unit_of_measurement}
                      </p>
                      {product.stock?.quantity != null && (
                        <p className={`text-xs font-medium mt-0.5 ${
                          outOfStock ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-gray-400'
                        }`}>
                          {outOfStock ? 'Out of stock' : `${product.stock.quantity} ${product.unit_of_measurement} in stock`}
                          {isLow && !outOfStock && ' • Low'}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-green-600">
                        ₦{getItemPrice(product).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {isWholesale && product.wholesale_price ? 'wholesale' : 'retail'} • per {product.unit_of_measurement}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Empty State */}
        {cartItems.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <ShoppingCart size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Cart is empty</p>
            <p className="text-gray-300 text-sm mt-1">Search for a product to add it</p>
          </div>
        )}

        {/* Cart Items */}
        {cartItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">
                Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      ₦{getItemPrice(item).toLocaleString()} per {item.unit_of_measurement}
                      {isWholesale && item.wholesale_price && (
                        <span className="text-orange-500 ml-1">(wholesale)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => setQtyInput(item.id, e.target.value)}
                      className="w-12 text-center text-sm font-medium border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-gray-800 w-24 text-right">
                    ₦{(getItemPrice(item) * (Number(item.quantity) || 0)).toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right — Order Summary */}
      <div className="w-full lg:w-80 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-20">
          <h2 className="font-semibold text-gray-700 mb-4">Order Summary</h2>

          {/* Customer Attach */}
          <CustomerPicker
            selectedCustomer={selectedCustomer}
            onSelect={setSelectedCustomer}
          />

          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto mt-4">
            {cartItems.length === 0 ? (
              <p className="text-gray-300 text-sm text-center py-4">No items yet</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate flex-1 mr-2">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="font-medium text-gray-800 flex-shrink-0">
                    ₦{(getItemPrice(item) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-green-600">
                ₦{total.toLocaleString()}
              </span>
            </div>
            {isWholesale && (
              <p className="text-xs text-orange-500 mt-1 text-right">Wholesale pricing applied</p>
            )}
          </div>

          <button
            onClick={() => {
              if (cartItems.length === 0) {
                toast.error('Add items to cart first')
                return
              }
              if (hasInvalidQty) {
                toast.error('Enter a valid quantity (greater than 0) for every item before proceeding')
                return
              }
              if (!activeBranchId) {
                toast.error('Please select a branch first')
                return
              }
              setShowPayment(true)
            }}
            disabled={hasInvalidQty}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Proceed to Payment
          </button>

          {cartItems.length > 0 && (
            <button
              onClick={() => setCartItems([])}
              className="w-full mt-2 text-sm text-red-400 hover:text-red-600 transition py-2"
            >
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          cartItems={cartItems}
          total={total}
          branchId={activeBranchId}
          cashierId={user?.id}
          customer={selectedCustomer}
          isWholesale={isWholesale}
          getItemPrice={getItemPrice}
          online={online}
          onClose={() => setShowPayment(false)}
          onSuccess={(sale) => {
            setCartItems([])
            setShowPayment(false)
            setSelectedCustomer(null)
            setIsWholesale(false)
            setReceipt(sale)
          }}
        />
      )}

      {showPendingSales && (
        <PendingSalesPanel
          onClose={() => setShowPendingSales(false)}
          onChange={refreshPendingCount}
        />
      )}

      {/* Receipt */}
      {receipt && (
        <Receipt
          sale={receipt}
          onClose={() => setReceipt(null)}
        />
      )}

    </div>
  )
}

// Customer search / quick-add
function CustomerPicker({ selectedCustomer, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get('/api/customers/search', { params: { q: query } })
        if (res.data.success) setResults(res.data.data)
      } catch {
        // silent — search just won't show results
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const pickCustomer = (customer) => {
    onSelect(customer)
    setQuery('')
    setResults([])
  }

  const clearCustomer = () => {
    onSelect(null)
    setQuery('')
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!newName || !newPhone) {
      toast.error('Name and phone are required')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/api/customers', { name: newName, phone: newPhone })
      if (res.data.success) {
        toast.success('Customer added!')
        onSelect(res.data.data)
        setShowQuickAdd(false)
        setNewName('')
        setNewPhone('')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer')
    } finally {
      setSaving(false)
    }
  }

  if (selectedCustomer) {
    return (
      <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <User size={16} className="text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{selectedCustomer.name}</p>
            <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
          </div>
        </div>
        <button onClick={clearCustomer} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Customer (optional)
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or phone"
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-1 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => pickCustomer(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
            >
              <p className="font-medium text-gray-800">{c.name}</p>
              <p className="text-xs text-gray-400">{c.phone}</p>
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && !showQuickAdd && (
        <button
          onClick={() => { setShowQuickAdd(true); setNewPhone(query.match(/^\d+$/) ? query : ''); setNewName(query.match(/^\d+$/) ? '' : query) }}
          className="mt-1 flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium"
        >
          <UserPlus size={13} /> No match — quick-add customer
        </button>
      )}

      {showQuickAdd && (
        <form onSubmit={handleQuickAdd} className="mt-2 bg-gray-50 rounded-lg p-3 space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Customer name"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add & Attach'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// Payment Modal
function PaymentModal({ cartItems, total, branchId, cashierId, customer, isWholesale, getItemPrice, online, onClose, onSuccess }) {
  const { user, defaultBranchId } = useAuthStore()
  const resolveBranchId = useBranchStore((state) => state.resolveBranchId)
  const [method, setMethod] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [creditAccount, setCreditAccount] = useState(customer?.credit_account || null)
  const [showOpenCredit, setShowOpenCredit] = useState(false)
  const [creditLimit, setCreditLimit] = useState('')
  const [openingCredit, setOpeningCredit] = useState(false)
  const [amountPaidNow, setAmountPaidNow] = useState('')
  const [methodNow, setMethodNow] = useState('cash')
  const [daysToSettle, setDaysToSettle] = useState('')

  // Converts a day-count into an actual calendar date, since the backend
  // stores a real due date (payment_due_date), not a day-count.
  const daysToSettleAsDate = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + Number(days))
    return d.toISOString().split('T')[0]
  }

  const allMethods = ['Cash', 'Transfer', 'POS', 'Credit', 'Split', 'Deposit']
  const methods = online ? allMethods : ['Cash', 'Transfer', 'POS']
  const needsCustomer = method === 'Credit' || method === 'Split' || method === 'Deposit'
  const remainingOnCredit = method === 'Split' ? Math.max(total - Number(amountPaidNow || 0), 0) : total

  const methodColors = {
    Cash: 'bg-green-50 border-green-300 text-green-700',
    Transfer: 'bg-blue-50 border-blue-300 text-blue-700',
    POS: 'bg-purple-50 border-purple-300 text-purple-700',
    Credit: 'bg-orange-50 border-orange-300 text-orange-700',
    Split: 'bg-pink-50 border-pink-300 text-pink-700',
    Deposit: 'bg-teal-50 border-teal-300 text-teal-700',
  }

  const depositBalance = Number(customer?.deposit_account?.current_balance || 0)
  const [depositAmountUsed, setDepositAmountUsed] = useState('')

  useEffect(() => {
    if (method === 'Deposit' && customer) {
      setDepositAmountUsed(String(Math.min(depositBalance, total)))
    }
  }, [method])

  const handleOpenCredit = async () => {
    if (!customer) return
    if (!creditLimit || Number(creditLimit) <= 0) {
      toast.error('Enter a valid credit limit')
      return
    }
    setOpeningCredit(true)
    try {
      const res = await api.put(`/api/customers/${customer.id}/credit/limit`, {
        credit_limit: Number(creditLimit),
      })
      if (res.data.success) {
        toast.success('Credit account opened!')
        setCreditAccount(res.data.data.credit_account || res.data.data)
        setShowOpenCredit(false)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open credit account')
    } finally {
      setOpeningCredit(false)
    }
  }

  const confirmUpfrontPayment = async (saleId, amount, paymentMethod) => {
    if (paymentMethod === 'cash') return confirmCashPayment(saleId, amount)
    if (paymentMethod === 'transfer') return confirmTransferPayment(saleId)
    if (paymentMethod === 'pos') return confirmPOSPayment(saleId)
  }

  const handleCompleteSale = async () => {
    if (!method) return

    if (!online && user?.role === 'super_admin' && branchId !== user?.branch_id) {
      toast.error('You need an internet connection to sell for a branch you\'re not assigned to.')
      return
    }

    if (needsCustomer && !customer) {
      toast.error('Select a customer first for credit/split payment')
      return
    }
    if ((method === 'Credit' || method === 'Split') && needsCustomer && !creditAccount) {
      toast.error('This customer has no credit account yet — open one first')
      return
    }
    if (method === 'Split') {
      if (!amountPaidNow || Number(amountPaidNow) <= 0) {
        toast.error('Enter the amount being paid now')
        return
      }
      if (Number(amountPaidNow) >= total) {
        toast.error('Amount paid now must be less than the total — use Cash/Transfer/POS instead if paying in full')
        return
      }
    }
    if ((method === 'Credit' || method === 'Split') && (!daysToSettle || Number(daysToSettle) <= 0)) {
      toast.error('Enter how many days the customer has to settle this credit')
      return
    }
    if (method === 'Deposit') {
      if (depositBalance < total) {
        toast.error(`Insufficient deposit balance. Customer has ₦${depositBalance.toLocaleString()}, sale total is ₦${total.toLocaleString()}.`)
        return
      }
    }

    setProcessing(true)

    try {
      const salePayload = {
        branch_id: branchId,
        cashier_id: cashierId,
        customer_id: customer?.id || null,
        payment_method: method.toLowerCase(),
        total_amount: total,
        is_wholesale: isWholesale,
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: getItemPrice(item),
          subtotal: getItemPrice(item) * item.quantity,
        })),
      }

      if (method === 'Credit' || method === 'Split') {
        salePayload.payment_due_date = daysToSettleAsDate(daysToSettle)
      }

      if (method === 'Split') {
        salePayload.amount_paid_now = Number(amountPaidNow)
        salePayload.payment_method_now = methodNow
      }
      if (method === 'Deposit') {
        salePayload.deposit_amount_used = total
      }

      if (!online) {
        const upfrontMethod = method.toLowerCase()
        await queueOfflineSale({
          salePayload,
          upfrontAmount: total,
          upfrontMethod,
        })
        toast.success('Sale saved offline — will sync automatically once reconnected')
        onSuccess({
          ...salePayload,
          id: salePayload.offline_id,
          created_at: new Date().toISOString(),
          payment_status: 'pending_sync',
          sale_items: salePayload.items.map((i) => ({
            ...i,
            products: { name: cartItems.find((c) => c.id === i.product_id)?.name },
          })),
        })
        return
      }

      const saleRes = await createSale(salePayload)
      if (!saleRes.success) {
        toast.error(saleRes.message || 'Failed to create sale')
        return
      }

      const saleId = saleRes.data.id
      let paymentRes

      if (method === 'Cash') {
        paymentRes = await confirmCashPayment(saleId, total)
      } else if (method === 'Transfer') {
        paymentRes = await confirmTransferPayment(saleId)
      } else if (method === 'POS') {
        paymentRes = await confirmPOSPayment(saleId)
      } else if (method === 'Credit') {
        paymentRes = saleRes
      } else if (method === 'Split') {
        paymentRes = await confirmUpfrontPayment(saleId, Number(amountPaidNow), methodNow)
      } else if (method === 'Deposit') {
        const depositBranchId = user?.role === 'super_admin' ? resolveBranchId(user, defaultBranchId) : undefined
        paymentRes = await confirmDepositPayment(saleId, total, depositBranchId)
      }

      if (paymentRes?.success) {
        toast.success('Sale completed!')
        try {
          const receiptRes = await api.get(`/api/sales/${saleId}/receipt`)
          onSuccess(receiptRes.data.success ? receiptRes.data.data : (paymentRes.data.sale || saleRes.data))
        } catch {
          // Fallback to whatever the payment confirmation gave us, so a
          // slow/failed receipt fetch never blocks completing the sale.
          onSuccess(paymentRes.data.sale || saleRes.data)
        }
      } else {
        toast.error('Payment confirmation failed')
      }

    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-green-50 rounded-xl p-4 text-center mb-5">
          <p className="text-sm text-gray-500 mb-1">Amount Due</p>
          <p className="text-3xl font-bold text-green-600">₦{total.toLocaleString()}</p>
        </div>

        {!online && (
          <div className="mb-4 bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
            You're offline — Credit and Split are disabled since they need a live balance check. This sale will save locally and sync automatically once you're back online.
          </div>
        )}

        <p className="text-sm font-medium text-gray-600 mb-3">Select Payment Method</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                method === m
                  ? methodColors[m]
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {method === 'Cash' && (
          <div className="mb-4 bg-green-50 rounded-xl p-4 text-sm text-green-700">
            <p className="font-medium">Collect exact amount from customer:</p>
            <p className="text-2xl font-bold mt-1">₦{total.toLocaleString()}</p>
          </div>
        )}

        {method === 'Transfer' && (
          <div className="mb-4 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <p className="mt-2 font-medium">Confirm on your bank app before proceeding.</p>
          </div>
        )}

        {method === 'POS' && (
          <div className="mb-4 bg-purple-50 rounded-xl p-4 text-sm text-purple-700">
            <p className="font-medium">Use the POS machine to collect payment.</p>
            <p className="mt-1">Confirm the transaction before clicking Complete.</p>
          </div>
        )}

        {needsCustomer && !customer && (
          <div className="mb-4 bg-red-50 rounded-xl p-4 text-sm text-red-600">
            <p className="font-medium">No customer selected.</p>
            <p className="mt-1 text-xs">Go back and search/attach a customer before using Credit or Split.</p>
          </div>
        )}

        {needsCustomer && customer && !creditAccount && (
          <div className="mb-4 bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
            <p className="font-medium mb-2">{customer.name} has no credit account yet.</p>
            {user?.role !== 'super_admin' ? (
              <p className="text-xs">Ask a super admin to open one.</p>
            ) : !showOpenCredit ? (
              <button
                type="button"
                onClick={() => setShowOpenCredit(true)}
                className="text-xs font-semibold text-orange-700 underline"
              >
                Open credit account now
              </button>
            ) : (
              <div className="space-y-2 mt-2">
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="Set credit limit (₦)"
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  type="button"
                  onClick={handleOpenCredit}
                  disabled={openingCredit}
                  className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
                >
                  {openingCredit ? 'Opening...' : 'Open Credit Account'}
                </button>
              </div>
            )}
          </div>
        )}

        {needsCustomer && customer && creditAccount && (
          <div className="mb-4 bg-orange-50 rounded-xl p-3 text-sm text-orange-700 flex justify-between">
            <span>Current balance: ₦{Number(creditAccount.current_balance).toLocaleString()}</span>
            <span>Limit: ₦{Number(creditAccount.credit_limit).toLocaleString()}</span>
          </div>
        )}

        {method === 'Credit' && customer && creditAccount && (
          <div className="mb-4 space-y-3">
            <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
              <p className="font-medium">Entire amount goes on credit:</p>
              <p className="text-2xl font-bold mt-1">₦{total.toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Days Until Repayment Due *</label>
              <input
                type="number"
                value={daysToSettle}
                onChange={(e) => setDaysToSettle(e.target.value)}
                placeholder="e.g. 14"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Customer will show up on the dashboard's overdue list after this many days
              </p>
            </div>
          </div>
        )}
                {method === 'Deposit' && customer && (
          <div className="mb-4 space-y-3">
            <div className="bg-teal-50 rounded-xl p-3 text-sm text-teal-700 flex justify-between">
              <span>Deposit balance</span>
              <span className="font-bold">₦{depositBalance.toLocaleString()}</span>
            </div>

            {depositBalance >= total ? (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Amount to Use from Deposit (₦)</label>
                <input
                  type="number"
                  value={depositAmountUsed}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Full amount covered by deposit
                </p>
              </div>
            ) : (
              <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600">
                <p className="font-medium">Insufficient deposit balance.</p>
                <p className="mt-1 text-xs">
                  Customer has ₦{depositBalance.toLocaleString()} but the sale total is ₦{total.toLocaleString()}.
                  Choose a different payment method, or record more of their deposit first (from the Deposits page), then come back to this sale.
                </p>
              </div>
            )}
          </div>
        )}

        {method === 'Split' && customer && creditAccount && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Amount Paying Now (₦)</label>
              <input
                type="number"
                value={amountPaidNow}
                onChange={(e) => setAmountPaidNow(e.target.value)}
                placeholder={`Less than ${total.toLocaleString()}`}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Paying Via</label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'transfer', 'pos'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethodNow(m)}
                    className={`py-2 rounded-xl border-2 text-xs font-semibold capitalize transition ${
                      methodNow === m
                        ? 'bg-pink-50 border-pink-400 text-pink-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-pink-50 rounded-xl p-3 text-sm text-pink-700 flex justify-between">
              <span>Remaining on credit</span>
              <span className="font-bold">₦{remainingOnCredit.toLocaleString()}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Days Until Repayment Due *</label>
              <input
                type="number"
                value={daysToSettle}
                onChange={(e) => setDaysToSettle(e.target.value)}
                placeholder="e.g. 14"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Customer will show up on the dashboard's overdue list after this many days
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleCompleteSale}
          disabled={
            !method || processing ||
            (needsCustomer && !customer) ||
            ((method === 'Credit' || method === 'Split') && needsCustomer && !creditAccount) ||
            (method === 'Deposit' && customer && depositBalance < total) ||
            ((method === 'Credit' || method === 'Split') && (!daysToSettle || Number(daysToSettle) <= 0))
          }
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto block" />
            : 'Complete Sale'
          }
        </button>

      </div>
    </div>
  )
}

export default POS