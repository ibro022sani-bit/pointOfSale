import { useState, useEffect } from 'react'
import { Plus, Search, Calendar, Trash2, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/branches')
      if (res.data.success) setBranches(res.data.data)
    } catch {
      // silent
    }
  }

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const params = {}
      if (isSuperAdmin && selectedBranch) params.branch_id = selectedBranch
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const res = await api.get('/api/expenses', { params })
      if (res.data.success) setExpenses(res.data.data)
    } catch {
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    fetchExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, dateFrom, dateTo])

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense record?')) return
    try {
      const res = await api.delete(`/api/expenses/${id}`)
      if (res.data.success) {
        toast.success('Expense deleted')
        fetchExpenses()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense')
    }
  }

  const filtered = expenses.filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.category?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)
  })

  const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} expenses · ₦{total.toLocaleString()} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by category or description"
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

      {/* Expenses Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Wallet size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No expenses found</p>
          <p className="text-gray-300 text-sm mt-1">Click "Add Expense" to record one</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Description</th>
                {isSuperAdmin && <th className="px-4 py-3 font-medium">Branch</th>}
                <th className="px-4 py-3 font-medium">Recorded By</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense) => (
                <tr key={expense.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(expense.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-lg bg-orange-50 text-orange-700">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{expense.description || '—'}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-gray-600">{expense.branches?.name || 'N/A'}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600">{expense.users?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ₦{Number(expense.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ExpenseModal
          branches={branches}
          isSuperAdmin={isSuperAdmin}
          userBranchId={user?.branch_id}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchExpenses()
          }}
        />
      )}

    </div>
  )
}

function ExpenseModal({ branches, isSuperAdmin, userBranchId, onClose, onSaved }) {
  const [form, setForm] = useState({
    branch_id: isSuperAdmin ? '' : (userBranchId || ''),
    category: '',
    description: '',
    amount: '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category || !form.amount) {
      toast.error('Category and amount are required')
      return
    }
    if (isSuperAdmin && !form.branch_id) {
      toast.error('Select a branch')
      return
    }
    setSaving(true)
    try {
      const payload = {
        category: form.category,
        description: form.description || null,
        amount: Number(form.amount),
        branch_id: isSuperAdmin ? form.branch_id : userBranchId,
      }

      const res = await api.post('/api/expenses', payload)
      if (res.data.success) {
        toast.success('Expense recorded!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {isSuperAdmin ? (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Branch *</label>
              <select
                name="branch_id"
                value={form.branch_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Branch</label>
              <input
                value={branches.find((b) => b.id === userBranchId)?.name || 'Your branch'}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Category *</label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Transport, Electricity, Repairs"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional details"
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₦) *</label>
            <input
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              placeholder="e.g. 5000"
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
              {saving ? 'Saving...' : 'Add Expense'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Expenses