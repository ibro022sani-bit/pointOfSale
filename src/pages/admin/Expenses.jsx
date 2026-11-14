import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import AddInline from '../../components/common/AddInline'

const LAGOS_MS = 60 * 60 * 1000
// A date in Lagos as YYYY-MM-DD, offsetDays back from today
const lagosDay = (offsetDays = 0) => new Date(Date.now() + LAGOS_MS - offsetDays * 86400000).toISOString().slice(0, 10)
const monthStart = () => `${lagosDay().slice(0, 8)}01`

const METHODS = [['cash', 'Cash'], ['transfer', 'Transfer'], ['pos', 'POS'], ['other', 'Other']]
const METHOD_LABEL = Object.fromEntries(METHODS)
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`
const showDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-NG', { dateStyle: 'medium' })
const byName = (a, b) => a.name.localeCompare(b.name)

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400'
const filterClass =
  'px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white'

function Expenses() {
  const { user } = useAuthStore()
  const isOwner = user?.role === 'super_admin'

  const [expenses, setExpenses] = useState([])
  const [branches, setBranches] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('') // '' = all, 'none' = business-wide, or a branch id
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(monthStart())
  const [dateTo, setDateTo] = useState(lagosDay())

  const [modal, setModal] = useState(null) // { expense } where expense is null when adding

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const params = {}
      if (isOwner && branchFilter) params.branch_id = branchFilter
      if (categoryFilter) params.category = categoryFilter
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

  useEffect(() => { fetchExpenses() }, [branchFilter, categoryFilter, dateFrom, dateTo])

  useEffect(() => {
    api.get('/api/expenses/categories').then((res) => setCategories(res.data.data)).catch(() => {})
    if (isOwner) {
      api.get('/api/branches').then((res) => setBranches(res.data.data || [])).catch(() => {})
    }
  }, [])

  const handleDelete = async (expense) => {
    if (!confirm('Delete this expense permanently? A copy is kept in the activity log.')) return
    try {
      await api.delete(`/api/expenses/${expense.id}`)
      toast.success('Expense deleted')
      fetchExpenses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete expense')
    }
  }

  const q = search.trim().toLowerCase()
  const shown = expenses.filter(
    (e) =>
      !q ||
      [e.category, e.description, e.reference, e.users?.name, e.branches?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
  )
  const total = shown.reduce((sum, e) => sum + Number(e.amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Expenses</h1>
          <p className="text-sm text-gray-500">
            {shown.length} expense{shown.length === 1 ? '' : 's'} · <span className="font-semibold text-gray-700">{naira(total)}</span>
          </p>
        </div>
        <button
          onClick={() => setModal({ expense: null })}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category, note, reference…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {isOwner && (
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={filterClass}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            <option value="none">Business-wide only</option>
          </select>
        )}

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterClass}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={filterClass} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={filterClass} />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">No expenses for these filters</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Details</th>
                {isOwner && <th className="px-4 py-3 font-medium">Branch</th>}
                <th className="px-4 py-3 font-medium">By</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{showDate(e.expense_date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.category}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {e.description && <p>{e.description}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {e.payment_method && (
                        <span className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {METHOD_LABEL[e.payment_method]}
                        </span>
                      )}
                      {e.reference && <span className="text-xs text-gray-400">Ref: {e.reference}</span>}
                      {e.updated_at && (
                        <span className="text-xs text-gray-400 italic" title={`Edited ${new Date(e.updated_at).toLocaleString('en-NG')}`}>
                          edited
                        </span>
                      )}
                    </div>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {e.branches?.name || <span className="italic text-gray-400">Business-wide</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.users?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">{naira(e.amount)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setModal({ expense: e })} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                      <Edit2 size={15} />
                    </button>
                    {isOwner && (
                      <button onClick={() => handleDelete(e)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ExpenseModal
          expense={modal.expense}
          isOwner={isOwner}
          branches={branches}
          categories={categories}
          setCategories={setCategories}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            fetchExpenses()
          }}
        />
      )}
    </div>
  )
}

function ExpenseModal({ expense, isOwner, branches, categories, setCategories, onClose, onSaved }) {
  const editing = !!expense
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    branch_id: expense ? expense.branch_id || 'none' : '',
    expense_date: expense?.expense_date || lagosDay(),
    category: expense?.category || '',
    amount: expense ? String(expense.amount) : '',
    payment_method: expense?.payment_method || '',
    reference: expense?.reference || '',
    description: expense?.description || '',
  })
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const categoryMissing = form.category && !categories.some((c) => c.name === form.category)

  const addCategory = async (name) => {
    try {
      const res = await api.post('/api/expenses/categories', { name })
      const created = res.data.data
      setCategories((list) => [...list, created].sort(byName))
      return created.name
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add category')
      return null
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isOwner && !form.branch_id) return toast.error('Choose a branch, or business-wide')
    if (!form.category) return toast.error('Choose a category')
    if (!(Number(form.amount) > 0)) return toast.error('Enter a valid amount')

    const payload = {
      expense_date: form.expense_date,
      category: form.category,
      amount: Number(form.amount),
      payment_method: form.payment_method || null,
      reference: form.reference,
      description: form.description,
    }
    if (isOwner) payload.branch_id = form.branch_id === 'none' ? null : form.branch_id

    setSaving(true)
    try {
      if (editing) await api.put(`/api/expenses/${expense.id}`, payload)
      else await api.post('/api/expenses', payload)
      toast.success(editing ? 'Expense updated' : 'Expense recorded')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {isOwner && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Branch *</label>
              <select value={form.branch_id} onChange={set('branch_id')} className={inputClass}>
                <option value="">Select branch…</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                <option value="none">Business-wide (not tied to a branch)</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date *</label>
              <input
                type="date"
                value={form.expense_date}
                max={lagosDay()}
                min={isOwner ? undefined : lagosDay(31)}
                onChange={set('expense_date')}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Amount (₦) *</label>
              <input type="number" min="0" step="any" value={form.amount} onChange={set('amount')} placeholder="e.g. 5000" className={inputClass} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">Category *</label>
            <select value={form.category} onChange={set('category')} className={inputClass}>
              <option value="">Select category…</option>
              {categoryMissing && <option value={form.category}>{form.category}</option>}
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <AddInline
              label="category"
              onAdd={addCategory}
              onAdded={(name) => setForm((f) => ({ ...f, category: name }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Paid by (optional)</label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, payment_method: f.payment_method === value ? '' : value }))}
                  className={`py-2 rounded-xl border-2 text-xs font-semibold transition ${
                    form.payment_method === value
                      ? 'bg-green-50 border-green-400 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Reference (optional)</label>
            <input value={form.reference} onChange={set('reference')} placeholder="Transfer reference or receipt number" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Note (optional)</label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="What was it for?" className={inputClass} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Expenses