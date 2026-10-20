import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, TrendingUp, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import useAuthStore from '../../../store/authStore'

function CustomerReport() {
  const [tab, setTab] = useState('spenders')
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [spenders, setSpenders] = useState([])
  const [loadingSpenders, setLoadingSpenders] = useState(true)
  const [debtors, setDebtors] = useState([])
  const [loadingDebtors, setLoadingDebtors] = useState(true)
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

  const fetchSpenders = async () => {
    setLoadingSpenders(true)
    try {
      const params = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (isSuperAdmin && selectedBranch) params.branch_id = selectedBranch

      const res = await api.get('/api/reports/customers/top-spenders', { params })
      if (res.data.success) setSpenders(res.data.data)
    } catch {
      toast.error('Failed to load top spenders')
    } finally {
      setLoadingSpenders(false)
    }
  }

  const fetchDebtors = async () => {
    setLoadingDebtors(true)
    try {
      const res = await api.get('/api/reports/debt')
      if (res.data.success) {
        const sorted = [...(res.data.data.accounts || [])].sort(
          (a, b) => Number(b.current_balance || 0) - Number(a.current_balance || 0)
        )
        setDebtors(sorted)
      }
    } catch {
      toast.error('Failed to load top debtors')
    } finally {
      setLoadingDebtors(false)
    }
  }

  useEffect(() => { if (isSuperAdmin) fetchBranches() }, [])
  useEffect(() => { if (tab === 'spenders') fetchSpenders() }, [tab, dateFrom, dateTo, selectedBranch])
  useEffect(() => { if (tab === 'debtors') fetchDebtors() }, [tab])

  return (
    <div className="space-y-4">
      <Link to="/admin/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition w-fit">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      <h1 className="text-xl font-bold text-gray-800">Customer Report</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('spenders')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === 'spenders' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Top Spenders
        </button>
        <button
          onClick={() => setTab('debtors')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === 'debtors' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Top Debtors
        </button>
      </div>

      {tab === 'spenders' && (
        <>
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
              <button onClick={() => applyPreset('7d')} className="px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition">Last 7 Days</button>
              <button onClick={() => applyPreset('30d')} className="px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition">Last 30 Days</button>
              <button onClick={() => applyPreset('1y')} className="px-3 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition">Last Year</button>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo('') }} className="px-3 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition">Clear</button>
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
          {!dateFrom && !dateTo && (
            <p className="text-xs text-gray-400">No date range selected — showing all-time totals.</p>
          )}

          {loadingSpenders ? (
            <div className="flex items-center justify-center py-16">
              <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : spenders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
              <TrendingUp size={48} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No purchases found for this period</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium text-right">Purchases</th>
                    <th className="px-4 py-3 font-medium text-right">Total Spent</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {spenders.map((c, i) => (
                    <tr key={c.customer_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{c.purchase_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">₦{Number(c.total_spent || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/customers/${c.customer_id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'debtors' && (
        loadingDebtors ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : debtors.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <Wallet size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No customers currently owe a balance</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-right">Balance Owed</th>
                  <th className="px-4 py-3 font-medium text-right">Credit Limit</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((a, i) => (
                  <tr key={a.customer_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.customers?.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-500">₦{Number(a.current_balance || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">₦{Number(a.credit_limit || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/customers/${a.customer_id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

export default CustomerReport