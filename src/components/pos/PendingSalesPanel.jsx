import { useState, useEffect } from 'react'
import { X, RefreshCw, Trash2, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPendingSales, syncPendingSales, removePendingSale, updatePendingSaleItems } from '../../services/offlineSync'

function PendingSalesPanel({ onClose, onChange }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editingSale, setEditingSale] = useState(null)

  const load = async () => {
    setLoading(true)
    const rows = await getPendingSales()
    setSales(rows)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      toast.error('Still offline — can\'t sync yet')
      return
    }
    setSyncing(true)
    const result = await syncPendingSales()
    setSyncing(false)
    if (result.synced > 0) toast.success(`Synced ${result.synced} sale${result.synced > 1 ? 's' : ''}`)
    if (result.failed > 0) toast.error(`${result.failed} still need attention`)
    if (result.synced === 0 && result.failed === 0) toast('Nothing to sync')
    await load()
    onChange?.()
  }

  const handleCancel = async (offlineId) => {
    if (!confirm('Cancel this offline sale? This cannot be undone.')) return
    await removePendingSale(offlineId)
    toast.success('Sale cancelled')
    await load()
    onChange?.()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Pending Sales</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="w-full mb-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No pending sales</p>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.offline_id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {new Date(sale.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                    sale.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {sale.status === 'failed' ? 'Needs Attention' : 'Waiting to Sync'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  ₦{Number(sale.payload.total_amount).toLocaleString()} · {sale.payload.items.length} item{sale.payload.items.length > 1 ? 's' : ''}
                </p>
                {sale.error_message && (
                  <p className="text-xs text-red-500 mt-1">{sale.error_message}</p>
                )}
                {sale.status === 'failed' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setEditingSale(sale)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 size={13} /> Adjust & Retry
                    </button>
                    <button
                      onClick={() => handleCancel(sale.offline_id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={13} /> Cancel Sale
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {editingSale && (
          <EditPendingSaleModal
            sale={editingSale}
            onClose={() => setEditingSale(null)}
            onSaved={async () => {
              setEditingSale(null)
              await load()
              onChange?.()
            }}
          />
        )}

      </div>
    </div>
  )
}

function EditPendingSaleModal({ sale, onClose, onSaved }) {
  const [items, setItems] = useState(sale.payload.items.map((i) => ({ ...i })))

  const updateQty = (index, qty) => {
    setItems(items.map((it, i) => i === index ? { ...it, quantity: Number(qty), subtotal: Number(qty) * it.unit_price } : it))
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const newTotal = items.reduce((sum, i) => sum + i.subtotal, 0)

  const handleRetry = async () => {
    if (items.length === 0) {
      toast.error('Add at least one item, or cancel this sale instead')
      return
    }
    await updatePendingSaleItems(sale.offline_id, items, newTotal)
    toast.success('Updated — will retry on next sync')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3">Adjust Sale</h3>
        <div className="space-y-2 mb-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg p-2">
              <span className="text-gray-700 truncate flex-1 mr-2">Product</span>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateQty(i, e.target.value)}
                className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm"
              />
              <button onClick={() => removeItem(i)} className="text-red-400 ml-2">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-4">New Total: ₦{newTotal.toLocaleString()}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancel</button>
          <button onClick={handleRetry} className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold">Save & Retry</button>
        </div>
      </div>
    </div>
  )
}

export default PendingSalesPanel