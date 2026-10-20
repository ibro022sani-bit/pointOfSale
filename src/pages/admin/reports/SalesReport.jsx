import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import useAuthStore from '../../../store/authStore'

function SalesReport() {
  const [data, setData] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

    const applyPreset = (preset) => {
    const today = new Date()
    const to = today.toISOString().split('T')[0]
    let from = new Date()
    if (preset === '7d') from.setDate(today.getDate() - 7)
    if (preset === '30d') from.setDate(today.getDate() - 30)
    if (preset === '1y') from.setFullYear(today.getFullYear() - 1)
    setDateFrom(from.toISOString().split('T')[0])
    setDateTo(to)
  }

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
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (isSuperAdmin && selectedBranch) params.branch_id = selectedBranch

      const res = await api.get('/api/reports/sales', { params })
      if (res.data.success) setData(res.data.data)
    } catch {
      toast.error('Failed to load sales report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (isSuperAdmin) fetchBranches() }, [])
  useEffect(() => { fetchReport() }, [dateFrom, dateTo, selectedBranch])

  return (
    <div className="space-y-4">
      <Link to="/admin/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition w-fit">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      <h1 className="text-xl font-bold text-gray-800">Sales Report</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        {isSuperAdmin && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
                <div className="flex gap-2">
          <button
            onClick={() => applyPreset('7d')}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => applyPreset('30d')}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => applyPreset('1y')}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
          >
            Last Year
          </button>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
      </div>

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
              <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₦{Number(data.total_revenue || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-gray-800">{data.transaction_count || 0}</p>
            </div>
          </div>

          {data.by_day?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Revenue by Day</p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.by_branch?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">By Branch</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Branch</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_branch.map((b, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-800">{b.branch}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₦{Number(b.revenue || 0).toLocaleString()}</td>
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

export default SalesReport