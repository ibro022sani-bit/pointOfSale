import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Check, X } from 'lucide-react'
import api from '../../services/api'

const inputClass =
  'flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400'

function CatalogManager() {
  const [catalog, setCatalog] = useState({ categories: [], units: [] })
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const load = async () => {
    try {
      const res = await api.get('/api/catalog')
      setCatalog(res.data.data)
    } catch {
      toast.error('Could not load categories')
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

  const addCategory = () => {
    if (!newCategory.trim()) return
    run(async () => {
      await api.post('/api/catalog/categories', { name: newCategory })
      setNewCategory('')
    }, 'Category added', 'Could not add category')
  }

  const saveRename = (c) =>
    run(async () => {
      await api.put(`/api/catalog/categories/${c.id}`, { name: editName })
      setEditingId(null)
    }, 'Category renamed', 'Could not rename category')

  const toggleMedicine = (c) =>
    run(() => api.put(`/api/catalog/categories/${c.id}`, { is_medicine: !c.is_medicine }), null, 'Could not update category')

  const removeCategory = (c) => {
    if (!confirm(`Delete the category "${c.name}"?`)) return
    run(() => api.delete(`/api/catalog/categories/${c.id}`), 'Category deleted', 'Could not delete category')
  }

  const addUnit = () => {
    if (!newUnit.trim()) return
    run(async () => {
      await api.post('/api/catalog/units', { name: newUnit })
      setNewUnit('')
    }, 'Unit added', 'Could not add unit')
  }

  const removeUnit = (u) => {
    if (!confirm(`Delete the unit "${u.name}"?`)) return
    run(() => api.delete(`/api/catalog/units/${u.id}`), 'Unit deleted', 'Could not delete unit')
  }

  if (loading) return null

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-gray-800">Product categories</h2>
        <p className="text-xs text-gray-400 mt-1">
          Group your products your own way. Tick "Medicine" for categories that need a drug type.
        </p>

        <ul className="mt-4 divide-y divide-gray-100">
          {catalog.categories.map((c) => (
            <li key={c.id} className="py-2.5 flex items-center gap-3">
              {editingId === c.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} autoFocus />
                  <button onClick={() => saveRename(c)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800 capitalize">{c.name}</span>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input type="checkbox" checked={c.is_medicine} onChange={() => toggleMedicine(c)} />
                    Medicine
                  </label>
                  <button onClick={() => { setEditingId(c.id); setEditName(c.name) }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                  <button onClick={() => removeCategory(c)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                </>
              )}
            </li>
          ))}
          {catalog.categories.length === 0 && <li className="py-3 text-sm text-gray-400">No categories yet.</li>}
        </ul>

        <div className="flex gap-2 mt-4">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="New category name"
            className={inputClass}
          />
          <button onClick={addCategory} className="px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium">Add</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="font-semibold text-gray-800">Units of measurement</h2>
        <p className="text-xs text-gray-400 mt-1">How you count or sell your products, such as piece, pair, crate or kg.</p>

        <div className="flex flex-wrap gap-2 mt-4">
          {catalog.units.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm rounded-full pl-3 pr-1.5 py-1">
              {u.name}
              <button onClick={() => removeUnit(u)} className="p-0.5 text-gray-400 hover:text-red-500" title="Delete"><X size={14} /></button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <input
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUnit()}
            placeholder="New unit, e.g. pair"
            className={inputClass}
          />
          <button onClick={addUnit} className="px-5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium">Add</button>
        </div>
      </div>
    </div>
  )
}

export default CatalogManager