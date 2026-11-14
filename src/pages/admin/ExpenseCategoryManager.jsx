import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Check, X } from 'lucide-react'
import api from '../../services/api'

const inputClass =
  'flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400'

function ExpenseCategoryManager() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const load = async () => {
    try {
      const res = await api.get('/api/expenses/categories')
      setCategories(res.data.data)
    } catch {
      toast.error('Could not load expense categories')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const run = async (fn, okMessage, failMessage) => {
    try {
      await fn()
      if (okMessage) toast.success(okMessage)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || failMessage)
    }
  }

  const add = () => {
    if (!newName.trim()) return
    run(async () => {
      await api.post('/api/expenses/categories', { name: newName })
      setNewName('')
    }, 'Category added', 'Could not add category')
  }

  const rename = (c) =>
    run(async () => {
      await api.put(`/api/expenses/categories/${c.id}`, { name: editName })
      setEditingId(null)
    }, 'Category renamed', 'Could not rename category')

  const remove = (c) => {
    if (!confirm(`Delete the category "${c.name}"? Expenses already recorded keep it.`)) return
    run(() => api.delete(`/api/expenses/categories/${c.id}`), 'Category deleted', 'Could not delete category')
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h2 className="font-semibold text-gray-800">Expense categories</h2>
      <p className="text-xs text-gray-400 mt-1">
        The list your team picks from when recording an expense. Renaming a category also updates past expenses.
      </p>

      <ul className="mt-4 divide-y divide-gray-100">
        {categories.map((c) => (
          <li key={c.id} className="py-2.5 flex items-center gap-3">
            {editingId === c.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} autoFocus />
                <button onClick={() => rename(c)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={16} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{c.name}</span>
                <button onClick={() => { setEditingId(c.id); setEditName(c.name) }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                <button onClick={() => remove(c)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </>
            )}
          </li>
        ))}
        {categories.length === 0 && <li className="py-3 text-sm text-gray-400">No categories yet.</li>}
      </ul>

      <div className="flex gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New category name"
          className={inputClass}
        />
        <button onClick={add} className="px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium">Add</button>
      </div>
    </div>
  )
}

export default ExpenseCategoryManager