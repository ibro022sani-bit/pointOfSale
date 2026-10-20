import { useState, useEffect } from 'react'
import { Search, PackageCheck, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useBranchStore from '../../store/branchStore'

function Collections() {
  const { user } = useAuthStore()
  const { activeBranchId } = useBranchStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const branchId = isSuperAdmin ? activeBranchId : user?.branch_id

  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [collectingId, setCollectingId] = useState(null)

  const fetchPending = async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const res = await api.get('/api/sales/pending-collection', { params: { branch_id: branchId } })
      if (res.data.success) setSales(res.data.data)
    } catch {
      toast.error('Could not load pending collections')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId])

  const handleCollect = async (saleId) => {
    setCollectingId(saleId)
    try {
      const res = await api.put(`/api/sales/${saleId}/collect`)
      if (res.data.success) {
        toast.success('Marked as collected')
        setSales((prev) => prev.filter((s) => s.id !== saleId))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as collected')
    } finally {
      setCollectingId(null)
    }
  }

  const filtered = sales.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    const idCode = s.id?.slice(0, 8).toLowerCase() || ''
    const offlineCode = s.offline_id?.slice(0, 8).toLowerCase() || ''
    return (
      idCode.includes(q) ||
      offlineCode.includes(q) ||
      s.customers?.name?.toLowerCase().includes(q) ||
      s.customers?.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Pending Collections</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sales made remotely by head office that customers still need to pick up here.
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by receipt code, customer name or phone"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <PackageCheck size={32} className="mx-auto mb-2" />
          <p className="text-sm">No pending collections{query ? ' match your search' : ' for this branch'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sale) => (
            <div key={sale.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-sm font-bold text-gray-800">
                    {sale.id?.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {sale.customers?.name || 'Walk-in'} {sale.customers?.phone ? `· ${sale.customers.phone}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sold by {sale.users?.name || 'Head Office'} · {new Date(sale.created_at).toLocaleString('en-NG')}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-800">₦{Number(sale.total_amount).toLocaleString()}</p>
              </div>

              <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
                {sale.sale_items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-gray-600">
                    <span>{item.products?.name} x{item.quantity}</span>
                    <span>₦{Number(item.subtotal).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleCollect(sale.id)}
                disabled={collectingId === sale.id}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition"
              >
                <CheckCircle2 size={16} />
                {collectingId === sale.id ? 'Marking...' : 'Mark as Collected'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Collections