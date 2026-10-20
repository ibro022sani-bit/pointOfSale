import { useState, useEffect } from 'react'
import { Search, Wallet, User, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useBranchStore from '../../store/branchStore'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { queueRepayment } from '../../services/offlineSync'

function CreditDebt() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [repayingCustomer, setRepayingCustomer] = useState(null)
  const { online } = useOnlineStatus()

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/customers')
      if (res.data.success) {
        // Only show customers who actually have a credit account
        setCustomers(res.data.data.filter((c) => c.credit_account))
      }
    } catch {
      toast.error('Failed to load credit accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [])

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  const totalOutstanding = customers.reduce(
    (sum, c) => sum + Number(c.credit_account?.current_balance || 0), 0
  )

  return (
    <div className="space-y-4">

      <div>
        <h1 className="text-xl font-bold text-gray-800">Credit & Debt</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {customers.length} customers on credit · ₦{totalOutstanding.toLocaleString()} outstanding
        </p>
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
          <p className="text-gray-400 font-medium">No credit accounts found</p>
          <p className="text-gray-300 text-sm mt-1">
            Credit accounts are opened during checkout when a customer needs credit
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium text-right">Balance Owed</th>
                <th className="px-4 py-3 font-medium text-right">Credit Limit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const account = customer.credit_account
                const balance = Number(account.current_balance || 0)
                const limit = Number(account.credit_limit || 0)
                const nearLimit = limit > 0 && balance / limit >= 0.8

                return (
                  <tr key={customer.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-orange-600" />
                        </div>
                        <span className="font-medium text-gray-800">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{customer.phone}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${balance > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                        ₦{balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">₦{limit.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {nearLimit ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                          <AlertCircle size={12} /> Near limit
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-400 capitalize">{account.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRepayingCustomer(customer)}
                        disabled={balance === 0}
                        className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        Record Repayment
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {repayingCustomer && (
        <RepaymentModal
          customer={repayingCustomer}
          online={online}
          onClose={() => setRepayingCustomer(null)}
          onSaved={() => {
            setRepayingCustomer(null)
            fetchCustomers()
          }}
        />
      )}

    </div>
  )
}

function RepaymentModal({ customer, online, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const { user, defaultBranchId } = useAuthStore()
  const resolveBranchId = useBranchStore((state) => state.resolveBranchId)

  const balance = Number(customer.credit_account?.current_balance || 0)
  const methods = ['cash', 'transfer', 'pos']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (Number(amount) > balance) {
      toast.error(`Amount can't exceed the outstanding balance of ₦${balance.toLocaleString()}`)
      return
    }
    if (user?.role === 'super_admin' && !resolveBranchId(user, defaultBranchId)) {
      toast.error('Set a default branch first (from the Branches screen) before recording a repayment')
      return
    }
    setSaving(true)
    try {
      const payload = { amount: Number(amount), payment_method: paymentMethod }
      if (reference) payload.reference = reference
      if (user?.role === 'super_admin') payload.branch_id = resolveBranchId(user, defaultBranchId)

      if (!online) {
        await queueRepayment(customer.id, payload)
        toast.success('Repayment saved offline — will sync once reconnected')
        onSaved()
        return
      }

      const res = await api.post(`/api/customers/${customer.id}/credit/repay`, payload)
      if (res.data.success) {
        toast.success('Repayment recorded!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record repayment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Record Repayment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-gray-800">{customer.name}</p>
          <p className="text-xs text-gray-500">{customer.phone}</p>
          <p className="text-sm text-orange-700 mt-2">
            Currently owes <span className="font-bold">₦{balance.toLocaleString()}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount Paying (₦) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Up to ${balance.toLocaleString()}`}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {amount && Number(amount) < balance && (
              <p className="text-xs text-gray-400 mt-1">
                Remaining balance after this: ₦{(balance - Number(amount)).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Payment Method</label>
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
              {saving ? 'Recording...' : 'Record Repayment'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default CreditDebt