import { useState, useEffect } from 'react'
import { Search, Wallet, User, Plus, X, UserPlus, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useBranchStore from '../../store/branchStore'

const SHOP_NAME = 'SADEEQ AGROVET AND GENERAL MERCHANT'

function Deposits() {
  const { user } = useAuthStore()
  const [customers, setCustomers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [depositingCustomer, setDepositingCustomer] = useState(null) // null = closed, {} = open picker, {id,...} = prefilled
  const [showNewDeposit, setShowNewDeposit] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  const [printingCustomer, setPrintingCustomer] = useState(null)

  const branchName = branches.find((b) => b.id === user?.branch_id)?.name || ''

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/customers')
      if (res.data.success) {
        // Only show customers who already have a deposit account
        setCustomers(res.data.data.filter((c) => c.deposit_account))
      }
    } catch {
      toast.error('Failed to load deposit accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    api.get('/api/branches')
      .then((res) => { if (res.data.success) setBranches(res.data.data) })
      .catch(() => {})
  }, [])

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  const totalHeld = customers.reduce(
    (sum, c) => sum + Number(c.deposit_account?.current_balance || 0), 0
  )

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Deposits</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} customers with deposits · ₦{totalHeld.toLocaleString()} held
          </p>
        </div>
        <button
          onClick={() => setShowNewDeposit(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Record Deposit
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Wallet size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No deposit accounts found</p>
          <p className="text-gray-300 text-sm mt-1">
            Click "Record Deposit" when a customer drops off money for later
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium text-right">Deposit Balance</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const balance = Number(customer.deposit_account?.current_balance || 0)
                return (
                  <tr key={customer.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-green-600" />
                        </div>
                        <span className="font-medium text-gray-800">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{customer.phone}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-green-600">
                        ₦{balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setPrintingCustomer(customer)}
                          title="Print balance receipt"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => setDepositingCustomer(customer)}
                          className="text-xs font-semibold text-green-600 hover:text-green-700"
                        >
                          Add More
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNewDeposit && (
        <CustomerPickerModal
          onClose={() => setShowNewDeposit(false)}
          onPicked={(customer) => {
            setShowNewDeposit(false)
            setDepositingCustomer(customer)
          }}
        />
      )}

      {depositingCustomer && (
        <RecordDepositModal
          customer={depositingCustomer}
          onClose={() => setDepositingCustomer(null)}
          onSaved={(receipt) => {
            setDepositingCustomer(null)
            fetchCustomers()
            setReceiptData({ ...receipt, shopName: SHOP_NAME, branchName, adminName: user?.name })
          }}
        />
      )}

      {receiptData && (
        <DepositReceiptModal
          receipt={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {printingCustomer && (
        <DepositReceiptModal
          receipt={{
            customerName: printingCustomer.name,
            customerPhone: printingCustomer.phone,
            newBalance: Number(printingCustomer.deposit_account?.current_balance || 0),
            date: new Date(),
            shopName: SHOP_NAME,
            branchName,
            adminName: user?.name,
          }}
          onClose={() => setPrintingCustomer(null)}
        />
      )}

    </div>
  )
}

// Search any customer (or quick-add a new one) before recording their deposit
function CustomerPickerModal({ onClose, onPicked }) {
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
        // silent
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

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
        onPicked(res.data.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Who's depositing?</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone"
            autoFocus
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {results.length > 0 && (
          <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm mb-2">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => onPicked(c)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
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
            className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium mt-1"
          >
            <UserPlus size={13} /> No match — quick-add customer
          </button>
        )}

        {showQuickAdd && (
          <form onSubmit={handleQuickAdd} className="mt-2 bg-gray-50 rounded-xl p-3 space-y-2">
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
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function RecordDepositModal({ customer, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const { user, defaultBranchId } = useAuthStore()
  const resolveBranchId = useBranchStore((state) => state.resolveBranchId)

  const balance = Number(customer.deposit_account?.current_balance || 0)
  const methods = ['cash', 'transfer', 'pos']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (user?.role === 'super_admin' && !resolveBranchId(user, defaultBranchId)) {
      toast.error('Set a default branch first (from the Branches screen) before recording a deposit')
      return
    }
    setSaving(true)
    try {
      const payload = { amount: Number(amount), payment_method: paymentMethod }
      if (reference) payload.reference = reference
      if (user?.role === 'super_admin') payload.branch_id = resolveBranchId(user, defaultBranchId)

      const res = await api.post(`/api/customers/${customer.id}/deposit/add`, payload)
      if (res.data.success) {
        toast.success('Deposit recorded!')
        onSaved({
          customerName: customer.name,
          customerPhone: customer.phone,
          amount: Number(amount),
          paymentMethod,
          reference,
          newBalance: res.data.data?.deposit_account?.current_balance ?? res.data.data?.current_balance,
          date: new Date(),
        })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record deposit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Record Deposit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-green-50 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-gray-800">{customer.name}</p>
          <p className="text-xs text-gray-500">{customer.phone}</p>
          {customer.deposit_account && (
            <p className="text-sm text-green-700 mt-2">
              Currently holds <span className="font-bold">₦{balance.toLocaleString()}</span> on deposit
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount Received (₦) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Received Via</label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-xl border-2 text-xs font-semibold capitalize transition ${
                    paymentMethod === m
                      ? 'bg-green-50 border-green-400 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Reference (optional)</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. transaction ID, note"
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
              {saving ? 'Recording...' : 'Record Deposit'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function DepositReceiptModal({ receipt, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * { visibility: hidden; }
          .printable-receipt, .printable-receipt * { visibility: visible; }
          .printable-receipt {
            position: fixed;
            top: 0;
            left: 0;
            width: 80mm;
            padding: 4mm;
            font-size: 12px;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 printable-receipt">

        <div className="flex items-center justify-between mb-5 no-print">
          <h2 className="text-lg font-bold text-gray-800">Deposit Receipt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="text-center border-b border-dashed border-gray-200 pb-4 mb-4">
          {receipt.shopName && (
            <p className="text-base font-bold text-gray-800 uppercase">{receipt.shopName}</p>
          )}
          {receipt.branchName && (
            <p className="text-xs text-gray-500 mt-0.5">{receipt.branchName} Branch</p>
          )}
          <p className="text-sm font-semibold text-gray-700 mt-2">{receipt.amount != null ? 'Deposit Receipt' : 'Balance Statement'}</p>
          <p className="text-xs text-gray-400 mt-1">
            {receipt.date.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium text-gray-800">{receipt.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone</span>
            <span className="font-medium text-gray-800">{receipt.customerPhone}</span>
          </div>
          {receipt.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-gray-500">Received Via</span>
              <span className="font-medium text-gray-800 capitalize">{receipt.paymentMethod}</span>
            </div>
          )}
          {receipt.reference && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-medium text-gray-800">{receipt.reference}</span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-200 pt-4 mb-4">
          {receipt.amount != null ? (
            <>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Amount Deposited</span>
                <span className="text-xl font-bold text-green-600">₦{receipt.amount.toLocaleString()}</span>
              </div>
              {receipt.newBalance != null && (
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-500">New Deposit Balance</span>
                  <span className="font-semibold text-gray-700">₦{Number(receipt.newBalance).toLocaleString()}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Current Deposit Balance</span>
              <span className="text-xl font-bold text-green-600">₦{Number(receipt.newBalance || 0).toLocaleString()}</span>
            </div>
          )}
        </div>

        {receipt.adminName && (
          <p className="text-xs text-gray-400 text-center mb-4">Served by {receipt.adminName}</p>
        )}

        <div className="flex gap-3 no-print">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Print Receipt
          </button>
        </div>

      </div>
    </div>
  )
}

export default Deposits