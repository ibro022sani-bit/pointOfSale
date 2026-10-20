import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import useAuthStore from '../../../store/authStore'

function StockReport() {
  const [data, setData] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState('')
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/branches')
      if (res.data.success) setBranches(res.data.data)
    } catch { /* silent */ }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = {}
      if (isSuperAdmin && selectedBranch) params.branch_id = selectedBranch
      else if (!isSuperAdmin) params.branch_id = user?.branch_id

      const res = await api.get('/api/reports/stock', { params })
      if (res.data.success) setData(res.data.data)
    } catch {
      toast.error('Failed to load stock report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (isSuperAdmin) fetchBranches() }, [])
  useEffect(() => { fetchReport() }, [selectedBranch])

  return (
    <div className="space-y-4">
      <Link to="/admin/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition w-fit">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      <h1 className="text-xl font-bold text-gray-800">Stock Report</h1>
      <p className="text-xs text-gray-400 -mt-3">Values are estimated using weighted-average cost from restock history</p>

      {isSuperAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-gray-400 text-center py-10">No data</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">Estimated Stock Value</p>
              <p className="text-2xl font-bold text-blue-600">₦{Number(data.total_estimated_value || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-500">{data.low_stock_count || 0}</p>
            </div>
          </div>

          {data.low_stock_items?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <p className="text-sm font-semibold text-gray-700">Low Stock Items</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.low_stock_items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-800">{item.product_name}</td>
                      <td className="px-4 py-3 text-right text-red-500 font-semibold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.items?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">All Stock</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Product</th>
                    {isSuperAdmin && !selectedBranch && <th className="px-4 py-3 font-medium">Branch</th>}
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                    <th className="px-4 py-3 font-medium text-right">Avg. Cost</th>
                    <th className="px-4 py-3 font-medium text-right">Est. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-800">{item.product_name}</td>
                      {isSuperAdmin && !selectedBranch && <td className="px-4 py-3 text-gray-500">{item.branch}</td>}
                      <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-500">₦{Number(item.average_cost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₦{Number(item.estimated_value || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default StockReport