import { useState, useEffect } from 'react'
import { Search, Calendar, Receipt as ReceiptIcon, Eye, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import Receipt from '../../components/pos/Receipt'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { refreshTodaySalesCache, getTodaySalesOffline } from '../../services/offlineSync'

function SalesHistory() {
  const [sales, setSales] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [viewingSale, setViewingSale] = useState(null)
  const [printSale, setPrintSale] = useState(null)
  const { user, defaultBranchId } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const { online } = useOnlineStatus()

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/branches')
      if (res.data.success) setBranches(res.data.data)
    } catch {
      // silent — branch filter just won't show options
    }
  }

  const fetchSales = async () => {
    setLoading(true)
    try {
      const branchToUse = isSuperAdmin ? selectedBranch : (user?.branch_id || defaultBranchId)

      if (!online) {
        const cached = await getTodaySalesOffline(branchToUse)
        setSales(cached)
        return
      }

      const params = {}
      if (branchToUse) params.branch_id = branchToUse
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const res = await api.get('/api/sales', { params })
      if (res.data.success) {
        setSales(res.data.data)
        refreshTodaySalesCache(branchToUse)
      }
    } catch {
      toast.error('Failed to load sales history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) fetchBranches()
  }, [])

  useEffect(() => {
    fetchSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, dateFrom, dateTo, online])

  const viewReceipt = async (saleId) => {
    try {
      const res = await api.get(`/api/sales/${saleId}/receipt`)
      if (res.data.success) setPrintSale(res.data.data)
    } catch {
      toast.error('Failed to load receipt')
    }
  }

  const filteredSales = sales.filter((sale) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      sale.id?.toLowerCase().includes(q) ||
      sale.users?.name?.toLowerCase().includes(q) ||
      sale.customers?.name?.toLowerCase().includes(q)
    )
  })

  const statusColor = (status) => {
    if (status === 'paid') return 'bg-green-50 text-green-600'
    if (status === 'pending') return 'bg-yellow-50 text-yellow-600'
    return 'bg-gray-100 text-gray-500'
  }

  const totalToday = filteredSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)

  return (
    <div className="space-y-4">

      {/* Header */}
      {!online && (
        <div className="bg-yellow-50 text-yellow-700 text-xs font-medium px-4 py-2 rounded-xl">
          Offline — showing today's sales only, including any of this device's unsynced sales
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Sales History</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredSales.length} sales · ₦{totalToday.toLocaleString()} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt no, cashier or customer"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {isSuperAdmin && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      {/* Sales Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <ReceiptIcon size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No sales found</p>
          <p className="text-gray-300 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Receipt No</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Cashier</th>
                {isSuperAdmin && <th className="px-4 py-3 font-medium">Branch</th>}
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {sale.id?.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(sale.created_at).toLocaleString('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sale.users?.name || 'N/A'}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-gray-600">{sale.branches?.name || 'N/A'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600 capitalize">{sale.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                      sale.payment_status === 'pending_sync' ? 'bg-orange-50 text-orange-600' : statusColor(sale.payment_status)
                    }`}>
                      {sale.payment_status === 'pending_sync' ? 'Pending Sync' : sale.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ₦{Number(sale.total_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewingSale(sale)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => viewReceipt(sale.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Reprint receipt"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sale Detail Modal */}
      {viewingSale && (
        <SaleDetailModal sale={viewingSale} onClose={() => setViewingSale(null)} />
      )}

      {/* Receipt Reprint */}
      {printSale && (
        <Receipt sale={printSale} onClose={() => setPrintSale(null)} />
      )}

    </div>
  )
}

function SaleDetailModal({ sale, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            Sale #{sale.id?.slice(0, 8).toUpperCase()}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-medium text-gray-800">
              {new Date(sale.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cashier</span>
            <span className="font-medium text-gray-800">{sale.users?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Branch</span>
            <span className="font-medium text-gray-800">{sale.branches?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Method</span>
            <span className="font-medium text-gray-800 capitalize">{sale.payment_method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="font-medium text-gray-800 capitalize">{sale.payment_status}</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Items</p>
          <div className="space-y-2">
            {sale.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-800">{item.products?.name}</p>
                  <p className="text-gray-400 text-xs">
                    {item.quantity} {item.products?.unit_of_measurement} × ₦{Number(item.unit_price).toLocaleString()}
                  </p>
                </div>
                <span className="font-medium text-gray-800">
                  ₦{Number(item.subtotal).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-bold text-gray-800">
          <span>Total</span>
          <span>₦{Number(sale.total_amount).toLocaleString()}</span>
        </div>

      </div>
    </div>
  )
}

export default SalesHistory