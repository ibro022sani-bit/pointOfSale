import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, Receipt } from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { refreshDashboardCache, getDashboardCache } from '../../services/offlineSync'

function CashierDashboard() {
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 })
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { online } = useOnlineStatus()
  const [cachedAt, setCachedAt] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!online) {
        const cached = await getDashboardCache(user?.branch_id)
        if (cached) {
          setTodaySales({ count: cached.salesCount, total: cached.salesTotal })
          setLowStock(cached.lowStock || [])
          setCachedAt(cached.updated_at)
        }
        setLoading(false)
        return
      }

      try {
        const [salesRes, stockRes] = await Promise.allSettled([
          api.get('/api/sales/today'),
          api.get('/api/stock/low-stock'),
        ])

        let salesCount = 0, salesTotal = 0, lowStockData = []

        if (salesRes.status === 'fulfilled' && salesRes.value.data.success) {
          const sales = salesRes.value.data.data
          salesCount = sales.length
          salesTotal = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
          setTodaySales({ count: salesCount, total: salesTotal })
        }

        if (stockRes.status === 'fulfilled' && stockRes.value.data.success) {
          lowStockData = stockRes.value.data.data
          setLowStock(lowStockData)
        }

        await refreshDashboardCache(user?.branch_id, { salesCount, salesTotal, lowStock: lowStockData })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [online])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {!online && cachedAt
            ? `Offline — showing data as of ${new Date(cachedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`
            : "Here's what's happening at your branch today"}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Receipt size={18} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-800">Today's Sales</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">₦{todaySales.total.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">{todaySales.count} transactions</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <p className="font-semibold text-gray-800">Low Stock Alerts</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{lowStock.length}</p>
            <p className="text-sm text-gray-400 mt-1">products running low</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashierDashboard