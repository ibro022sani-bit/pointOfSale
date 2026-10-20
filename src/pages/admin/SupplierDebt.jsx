import { useState, useEffect } from 'react'
import { Truck, AlertCircle, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

function SupplierDebt() {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unpaid')
  const [payingReceipt, setPayingReceipt] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [expandedDetail, setExpandedDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [showOpeningBalance, setShowOpeningBalance] = useState(false)
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const fetchReceipts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/stock/restock', { params: { payment_status: filter } })
      if (res.data.success) setReceipts(res.data.data)
    } catch {
      toast.error('Failed to load supplier orders')
    } finally {
      setLoading(false)
    }
  }
    const fetchSuppliers = async () => {
    try {
      const res = await api.get('/api/suppliers')
      if (res.data.success) setSuppliers(res.data.data)
    } catch {
      // silent
    }
  }
  
  useEffect(() => {
    fetchReceipts()
    fetchSuppliers()
  }, [filter])

  const fetchDetail = async (receiptId) => {
    setLoadingDetail(true)
    try {
      const res = await api.get(`/api/stock/restock/${receiptId}`)
      if (res.data.success) setExpandedDetail(res.data.data)
    } catch {
      toast.error('Failed to load restock detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  const toggleExpand = async (receiptId) => {
    if (expandedId === receiptId) {
      setExpandedId(null)
      setExpandedDetail(null)
      return
    }
    setExpandedId(receiptId)
    await fetchDetail(receiptId)
  }
  const totalOwed = receipts.reduce(
    (sum, r) => sum + (Number(r.total_cost || 0) - Number(r.amount_paid || 0)), 0
  )

  const filters = [
    { id: 'unpaid', label: 'Unpaid' },
    { id: 'partial', label: 'Partial' },
    { id: 'paid', label: 'Paid' },
  ]

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Supplier Debt</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {receipts.length} orders · ₦{totalOwed.toLocaleString()} owed
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowOpeningBalance(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Add Opening Balance
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f.id
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Truck size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No {filter} orders</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium text-right">Total Cost</th>
                <th className="px-4 py-3 font-medium text-right">Paid</th>
                <th className="px-4 py-3 font-medium text-right">Owed</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => {
                const owed = Number(r.total_cost || 0) - Number(r.amount_paid || 0)
                const isExpanded = expandedId === r.id
                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => toggleExpand(r.id)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(r.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{r.suppliers?.name || 'No supplier'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.branches?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ₦{Number(r.total_cost).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ₦{Number(r.amount_paid || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">
                        ₦{owed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {owed > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPayingReceipt(r) }}
                            className="text-xs font-semibold text-green-600 hover:text-green-700"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          {loadingDetail ? (
                            <div className="flex justify-center py-4">
                              <span className="w-5 h-5 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-2">Items</p>
                              <RestockItemsSection
                                items={expandedDetail?.stock_receipt_items}
                                receiptId={r.id}
                                isSuperAdmin={isSuperAdmin}
                                onCorrected={() => { fetchDetail(r.id); fetchReceipts() }}
                              />
                              <p className="text-xs font-semibold text-gray-500 mb-2 mt-4">Payment History</p>
                              {(!expandedDetail?.payments || expandedDetail.payments.length === 0) ? (
                                <p className="text-xs text-gray-400">No payments recorded yet</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {expandedDetail.payments.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                                      <div className="flex items-center gap-3">
                                        <span className="text-gray-500">
                                          {new Date(p.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                                        </span>
                                        <span className="capitalize text-gray-600">{p.payment_method}</span>
                                        {p.reference && <span className="text-gray-400">Ref: {p.reference}</span>}
                                        <span className="text-gray-400">by {p.users?.name || 'Unknown'}</span>
                                      </div>
                                      <span className="font-semibold text-gray-800">
                                        ₦{Number(p.amount).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
            {showOpeningBalance && (
        <OpeningBalanceModal
          suppliers={suppliers}
          onClose={() => setShowOpeningBalance(false)}
          onSaved={() => {
            setShowOpeningBalance(false)
            fetchReceipts()
          }}
        />
      )}

      {payingReceipt && (
        <SupplierPaymentModal
          receipt={payingReceipt}
          onClose={() => setPayingReceipt(null)}
          onSaved={() => {
            setPayingReceipt(null)
            fetchReceipts()
            if (expandedId === payingReceipt.id) {
              setExpandedId(null)
              setExpandedDetail(null)
            }
          }}
        />
      )}

    </div>
  )
}

function RestockItemsSection({ items, receiptId, isSuperAdmin, onCorrected }) {
  const [editingId, setEditingId] = useState(null)
  const [qtyInput, setQtyInput] = useState('')
  const [costInput, setCostInput] = useState('')
  const [saving, setSaving] = useState(false)

  if (!items || items.length === 0) {
    return <p className="text-xs text-gray-400">No items recorded</p>
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setQtyInput(item.quantity)
    setCostInput(item.cost_price)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setQtyInput('')
    setCostInput('')
  }

  const saveEdit = async (itemId) => {
    if (!qtyInput || Number(qtyInput) <= 0) {
      toast.error('Enter a valid quantity')
      return
    }
    setSaving(true)
    try {
      const res = await api.put(`/api/stock/restock/${receiptId}/items/${itemId}`, {
        quantity: Number(qtyInput),
        cost_price: Number(costInput),
      })
      if (res.data.success) {
        toast.success('Item corrected')
        if (res.data.data?.warning) toast(res.data.data.warning, { icon: '⚠️' })
        cancelEdit()
        onCorrected()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to correct item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
          {editingId === item.id ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-gray-700 flex-1">{item.products?.name}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs"
                placeholder="Qty"
              />
              <span className="text-gray-400">x</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs"
                placeholder="Cost"
              />
              <button
                onClick={() => saveEdit(item.id)}
                disabled={saving}
                className="text-green-600 font-semibold hover:text-green-700 disabled:opacity-50"
              >
                Save
              </button>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="text-gray-700">
                {item.products?.name} · {item.quantity} x ₦{Number(item.cost_price).toLocaleString()}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">
                  ₦{(Number(item.quantity) * Number(item.cost_price)).toLocaleString()}
                </span>
                {isSuperAdmin && (
                  <button
                    onClick={() => startEdit(item)}
                    className="text-blue-600 font-semibold hover:text-blue-700"
                  >
                    Correct
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function SupplierPaymentModal({ receipt, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)

  const owed = Number(receipt.total_cost || 0) - Number(receipt.amount_paid || 0)
  const methods = ['cash', 'transfer', 'pos']

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (Number(amount) > owed) {
      toast.error(`Amount can't exceed what's owed: ₦${owed.toLocaleString()}`)
      return
    }
    setSaving(true)
    try {
      const payload = { amount: Number(amount), payment_method: paymentMethod }
      if (reference) payload.reference = reference

      const res = await api.post(`/api/stock/restock/${receipt.id}/pay`, payload)
      if (res.data.success) {
        toast.success('Payment recorded!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Record Supplier Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-gray-800">{receipt.suppliers?.name || 'No supplier'}</p>
          <p className="text-xs text-gray-500">{receipt.branches?.name}</p>
          <p className="text-sm text-orange-700 mt-2">
            Still owed <span className="font-bold">₦{owed.toLocaleString()}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount Paying (₦) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Up to ${owed.toLocaleString()}`}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
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
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
function OpeningBalanceModal({ suppliers, onClose, onSaved }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '')
  const [totalCost, setTotalCost] = useState('')
  const [amountPaidNow, setAmountPaidNow] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supplierId) return toast.error('Select a supplier')
    if (!totalCost || Number(totalCost) <= 0) return toast.error('Enter a valid total amount')
    if (amountPaidNow && Number(amountPaidNow) > Number(totalCost)) {
      return toast.error('Amount paid cannot exceed total owed')
    }
    setSaving(true)
    try {
      const payload = {
        supplier_id: supplierId,
        total_cost: Number(totalCost),
      }
      if (amountPaidNow) payload.amount_paid_now = Number(amountPaidNow)
      if (notes) payload.notes = notes

      const res = await api.post('/api/stock/restock/opening-balance', payload)
      if (res.data.success) {
        toast.success('Opening balance added!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add opening balance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Add Opening Balance</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          For money already owed to a supplier from before this system was in use — no product line items needed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Total Amount Owed (₦) *</label>
            <input
              type="number"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="e.g. 80000"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Already Paid (₦)</label>
            <input
              type="number"
              value={amountPaidNow}
              onChange={(e) => setAmountPaidNow(e.target.value)}
              placeholder="Leave blank if nothing paid yet"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Balance carried over from before Jan 2026"
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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Opening Balance'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default SupplierDebt