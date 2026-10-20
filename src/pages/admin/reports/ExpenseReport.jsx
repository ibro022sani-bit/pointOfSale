import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import useAuthStore from '../../../store/authStore'

function ExpenseReport() {
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

      const res = await api.get('/api/reports/expenses', { params })
      if (res.data.success) setData(res.data.data)
    } catch {
      toast.error('Failed to load expense report')
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

      <h1 className="text-xl font-bold text-gray-800">Expense Report</h1>

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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-orange-600">₦{Number(data.total_expenses || 0).toLocaleString()}</p>
          </div>

          {data.by_category?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">By Category</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_category.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg bg-orange-50 text-orange-700">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">₦{Number(c.total || 0).toLocaleString()}</td>
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

export default ExpenseReport