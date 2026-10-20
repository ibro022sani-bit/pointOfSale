import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Wallet, AlertCircle, PlusCircle, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useBranchStore from '../../store/branchStore'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { queueRepayment } from '../../services/offlineSync'

function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPurchases, setLoadingPurchases] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [showRepay, setShowRepay] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showOpenCredit, setShowOpenCredit] = useState(false)
  const [depositTransactions, setDepositTransactions] = useState([])
  const [loadingDepositTransactions, setLoadingDepositTransactions] = useState(true)
  const [showRecordDeposit, setShowRecordDeposit] = useState(false)
  const [showAdjustDeposit, setShowAdjustDeposit] = useState(false)
  const [togglingSpecial, setTogglingSpecial] = useState(false)
  const { user } = useAuthStore()
  const canAdjustDebt = user?.role === 'admin' || user?.role === 'super_admin'
  const canManageCredit = user?.role === 'super_admin'
  const { online } = useOnlineStatus()

  const handleToggleSpecial = async () => {
    setTogglingSpecial(true)
    try {
      const res = await api.put(`/api/customers/${id}`, { is_special_customer: !customer.is_special_customer })
      if (res.data.success) {
        toast.success(customer.is_special_customer ? 'Removed special pricing' : 'Marked as special customer')
        fetchCustomer()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update customer')
    } finally {
      setTogglingSpecial(false)
    }
  }

  const fetchCustomer = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/customers/${id}`)
      if (res.data.success) setCustomer(res.data.data)
    } catch {
      toast.error('Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchases = async () => {
    setLoadingPurchases(true)
    try {
      const res = await api.get(`/api/customers/${id}/purchases`)
      if (res.data.success) setPurchases(res.data.data)
    } catch {
      // silent — purchase history is supplementary, not critical
    } finally {
      setLoadingPurchases(false)
    }
  }

  const fetchTransactions = async () => {
    setLoadingTransactions(true)
    try {
      const res = await api.get(`/api/customers/${id}/credit/transactions`)
      if (res.data.success) setTransactions(res.data.data)
    } catch {
      // silent
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fetchDepositTransactions = async () => {
    setLoadingDepositTransactions(true)
    try {
      const res = await api.get(`/api/customers/${id}/deposit/transactions`)
      if (res.data.success) setDepositTransactions(res.data.data)
    } catch {
      // silent
    } finally {
      setLoadingDepositTransactions(false)
    }
  }

  useEffect(() => {
    fetchCustomer()
    fetchPurchases()
    fetchTransactions()
    fetchDepositTransactions()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Customer not found</p>
      </div>
    )
  }

  const account = customer.credit_account
  const balance = Number(account?.current_balance || 0)
  const limit = Number(account?.credit_limit || 0)

  const depositAccount = customer.deposit_account
  const depositBalance = Number(depositAccount?.current_balance || 0)

  return (
    <div className="space-y-4">

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800">{customer.name}</h1>
              {customer.is_special_customer && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                  <Star size={12} /> Special Customer
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {customer.phone && (
                <span className="flex items-center gap-1.5"><Phone size={14} /> {customer.phone}</span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1.5"><Mail size={14} /> {customer.email}</span>
              )}
            </div>
            {customer.address && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                <MapPin size={14} /> {customer.address}
              </p>
            )}
          </div>

          {canAdjustDebt && (
            <button
              onClick={handleToggleSpecial}
              disabled={togglingSpecial}
              className={`text-xs font-semibold px-3 py-2 rounded-xl transition disabled:opacity-60 ${
                customer.is_special_customer
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {togglingSpecial
                ? 'Updating...'
                : customer.is_special_customer
                  ? 'Remove Special Pricing'
                  : 'Mark as Special Customer'}
            </button>
          )}
        </div>
      </div>

      {/* Credit Account */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-700">Credit Account</h2>
          </div>
          {canManageCredit && (
            <button
              onClick={() => setShowAdjust(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <PlusCircle size={14} />
              Add Historical Debt
            </button>
          )}
        </div>

        {!account ? (
          <div>
            <p className="text-gray-400 text-sm mb-3">
              No credit account yet — one gets opened automatically the first time this customer uses Credit or Split payment at checkout, or when historical debt is added.
            </p>
            {canManageCredit && (
              <button
                onClick={() => setShowOpenCredit(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <PlusCircle size={14} />
                Open Credit Account
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Outstanding Balance</p>
                <p className="text-xl font-bold text-red-500">₦{balance.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Credit Limit</p>
                <p className="text-xl font-bold text-gray-800">₦{limit.toLocaleString()}</p>
              </div>
            </div>

            {limit > 0 && balance / limit >= 0.8 && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-xl p-3 mb-4">
                <AlertCircle size={14} />
                Customer is close to their credit limit
              </div>
            )}

            <button
              onClick={() => setShowRepay(true)}
              disabled={balance === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              Record Repayment
            </button>
          </>
        )}
      </div>

      {/* Deposit Account */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-700">Deposit Account</h2>
          </div>
          <div className="flex items-center gap-3">
            {canAdjustDebt && (
              <button
                onClick={() => setShowAdjustDeposit(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <PlusCircle size={14} />
                Add Historical Deposit
              </button>
            )}
            <button
              onClick={() => setShowRecordDeposit(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700"
            >
              <PlusCircle size={14} />
              Record Deposit
            </button>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Deposit Balance</p>
          <p className="text-xl font-bold text-green-600">₦{depositBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Credit Transaction History</h2>
        </div>

        {loadingTransactions ? (
          <div className="flex items-center justify-center py-10">
            <span className="w-6 h-6 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No credit transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      t.type === 'debit' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {t.type === 'debit' ? 'Debt Added' : 'Repayment'}
                    </span>
                    {!t.sale_id && (
                      <span className="text-xs text-gray-400 italic">manual entry</span>
                    )}
                  </div>
                  {t.note && <p className="text-xs text-gray-500 mt-1">{t.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(t.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${t.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>
                    {t.type === 'debit' ? '+' : '-'}₦{Number(t.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Balance: ₦{Number(t.balance_after).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Deposit Transaction History</h2>
        </div>

        {loadingDepositTransactions ? (
          <div className="flex items-center justify-center py-10">
            <span className="w-6 h-6 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : depositTransactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No deposit transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {depositTransactions.map((t) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      t.type === 'deposit_out' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {t.type === 'deposit_out' ? 'Used at Checkout' : 'Deposit Added'}
                    </span>
                    {!t.sale_id && (
                      <span className="text-xs text-gray-400 italic">manual entry</span>
                    )}
                  </div>
                  {t.note && <p className="text-xs text-gray-500 mt-1">{t.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(t.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                    {t.staff_name ? ` · by ${t.staff_name}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${t.type === 'deposit_out' ? 'text-red-500' : 'text-green-600'}`}>
                    {t.type === 'deposit_out' ? '-' : '+'}₦{Number(t.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Balance: ₦{Number(t.balance_after).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Purchase History</h2>
        </div>

        {loadingPurchases ? (
          <div className="flex items-center justify-center py-10">
            <span className="w-6 h-6 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">No purchases yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {purchases.map((sale) => (
              <div key={sale.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(sale.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    ₦{Number(sale.total_amount).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="capitalize">{sale.payment_method}</span>
                  <span>·</span>
                  <span className={`capitalize font-medium ${sale.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {sale.payment_status}
                  </span>
                  {sale.branches?.name && (
                    <>
                      <span>·</span>
                      <span>{sale.branches.name}</span>
                    </>
                  )}
                </div>
                {sale.sale_items?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {sale.sale_items.map((i) => i.products?.name).filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRepay && (
        <RepaymentModal
          customer={customer}
          online={online}
          onClose={() => setShowRepay(false)}
          onSaved={() => {
            setShowRepay(false)
            fetchCustomer()
            fetchTransactions()
          }}
        />
      )}

      {showAdjust && (
        <AdjustDebtModal
          customer={customer}
          onClose={() => setShowAdjust(false)}
          onSaved={() => {
            setShowAdjust(false)
            fetchCustomer()
            fetchTransactions()
          }}
        />
      )}

      {showOpenCredit && (
        <OpenCreditModal
          customer={customer}
          onClose={() => setShowOpenCredit(false)}
          onSaved={() => {
            setShowOpenCredit(false)
            fetchCustomer()
            fetchTransactions()
          }}
        />
      )}

      {showRecordDeposit && (
        <RecordDepositModal
          customer={customer}
          onClose={() => setShowRecordDeposit(false)}
          onSaved={() => {
            setShowRecordDeposit(false)
            fetchCustomer()
            fetchDepositTransactions()
          }}
        />
      )}

      {showAdjustDeposit && (
        <AdjustDepositModal
          customer={customer}
          onClose={() => setShowAdjustDeposit(false)}
          onSaved={() => {
            setShowAdjustDeposit(false)
            fetchCustomer()
            fetchDepositTransactions()
          }}
        />
      )}

    </div>
  )
}

function AdjustDebtModal({ customer, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const hasAccount = !!customer.credit_account

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!hasAccount && (!creditLimit || Number(creditLimit) <= 0)) {
      toast.error('Set a credit limit — this customer has no account yet')
      return
    }
    setSaving(true)
    try {
      const payload = { amount: Number(amount) }
      if (note) payload.note = note
      if (!hasAccount) payload.credit_limit = Number(creditLimit)

      const res = await api.post(`/api/customers/${customer.id}/credit/adjust`, payload)
      if (res.data.success) {
        toast.success('Historical debt added!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add debt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Add Historical Debt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          For debt owed from before this system was in use — not tied to any specific sale.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount Owed (₦) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {!hasAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Credit Limit (₦) — required, no account yet
              </label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Debt from before Jan 2026"
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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Debt'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function OpenCreditModal({ customer, onClose, onSaved }) {
  const [creditLimit, setCreditLimit] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!creditLimit || Number(creditLimit) <= 0) {
      toast.error('Enter a valid credit limit')
      return
    }
    setSaving(true)
    try {
      const res = await api.put(`/api/customers/${customer.id}/credit/limit`, {
        credit_limit: Number(creditLimit),
      })
      if (res.data.success) {
        toast.success('Credit account opened!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open credit account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Open Credit Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Sets a credit limit for {customer.name} with no starting balance owed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Credit Limit (₦) *</label>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="e.g. 50000"
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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Opening...' : 'Open Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RepaymentModal({ customer, online, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)

  const balance = Number(customer.credit_account?.current_balance || 0)
  const depositBalance = Number(customer.deposit_account?.current_balance || 0)
  const hasDeposit = depositBalance > 0
  const methods = ['cash', 'transfer', 'pos', ...(hasDeposit ? ['deposit'] : [])]

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
    if (paymentMethod === 'deposit' && Number(amount) > depositBalance) {
      toast.error(`Amount can't exceed the deposit balance of ₦${depositBalance.toLocaleString()}`)
      return
    }
    setSaving(true)
    try {
      if (paymentMethod === 'deposit') {
        const res = await api.post(`/api/customers/${customer.id}/credit/repay-from-deposit`, { amount: Number(amount) })
        if (res.data.success) {
          toast.success('Repaid from deposit balance!')
          onSaved()
        }
        return
      }

      const payload = { amount: Number(amount), payment_method: paymentMethod }
      if (reference) payload.reference = reference

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
          <p className="text-sm text-orange-700 mt-2">
            Currently owes <span className="font-bold">₦{balance.toLocaleString()}</span>
          </p>
          {hasDeposit && (
            <p className="text-sm text-green-700 mt-1">
              Deposit available: <span className="font-bold">₦{depositBalance.toLocaleString()}</span>
            </p>
          )}
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Payment Method</label>
            <div className={`grid gap-2 ${hasDeposit ? 'grid-cols-4' : 'grid-cols-3'}`}>
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

          {paymentMethod !== 'deposit' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Reference (optional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. transaction ID, note"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
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
              {saving ? 'Recording...' : 'Record Repayment'}
            </button>
          </div>
        </form>
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
        onSaved()
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
          <p className="text-sm text-green-700 mt-2">
            Currently holds <span className="font-bold">₦{balance.toLocaleString()}</span> on deposit
          </p>
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

function AdjustDepositModal({ customer, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const { user, defaultBranchId } = useAuthStore()
  const resolveBranchId = useBranchStore((state) => state.resolveBranchId)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (user?.role === 'super_admin' && !resolveBranchId(user, defaultBranchId)) {
      toast.error('Set a default branch first (from the Branches screen) before recording this')
      return
    }
    setSaving(true)
    try {
      const payload = { amount: Number(amount) }
      if (note) payload.note = note
      if (user?.role === 'super_admin') payload.branch_id = resolveBranchId(user, defaultBranchId)

      const res = await api.post(`/api/customers/${customer.id}/deposit/adjust`, payload)
      if (res.data.success) {
        toast.success('Historical deposit added!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add deposit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Add Historical Deposit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          For deposit balance carried over from before this system was in use — not tied to any specific transaction.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₦) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Deposit balance from before Jan 2026"
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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CustomerDetail