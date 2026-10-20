import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, GitBranch, MapPin, Phone, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

function Branches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { user, defaultBranchId, setDefaultBranch } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const fetchBranches = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/branches')
      if (res.data.success) setBranches(res.data.data)
    } catch {
      toast.error('Failed to load branches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBranches() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this branch?')) return
    try {
      const res = await api.delete(`/api/branches/${id}`)
      if (res.data.success) {
        toast.success('Branch deleted')
        fetchBranches()
      }
    } catch {
      toast.error('Failed to delete branch')
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">{branches.length} branches registered</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Branch
        </button>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <GitBranch size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No branches yet</p>
          <p className="text-gray-300 text-sm mt-1">Click "Add Branch" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

              {/* Branch Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    branch.is_main ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <GitBranch size={18} className={branch.is_main ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{branch.name}</p>
                    {branch.is_main && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <Star size={10} />
                        Main Branch
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(branch); setShowModal(true) }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  {!branch.is_main && (
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Branch Details */}
              <div className="space-y-2">
                {branch.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin size={14} className="flex-shrink-0 mt-0.5 text-gray-400" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} className="text-gray-400" />
                    <span>{branch.phone}</span>
                  </div>
                )}
              </div>

              {/* Status + Default */}
<div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
    branch.is_active
      ? 'bg-green-50 text-green-600'
      : 'bg-red-50 text-red-500'
  }`}>
    {branch.is_active ? 'Active' : 'Inactive'}
  </span>

  {isSuperAdmin && (
    <button
      onClick={() => {
        setDefaultBranch(branch.id)
        toast.success(`${branch.name} set as default branch`)
      }}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
        defaultBranchId === branch.id
          ? 'bg-green-600 text-white'
          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
      }`}
    >
      {defaultBranchId === branch.id ? '✓ Default' : 'Set Default'}
    </button>
  )}
</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <BranchModal
          branch={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchBranches()
          }}
        />
      )}

    </div>
  )
}

function BranchModal({ branch, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    is_main: branch?.is_main || false,
    is_active: branch?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) {
      toast.error('Branch name is required')
      return
    }
    setSaving(true)
    try {
      const res = branch
        ? await api.put(`/api/branches/${branch.id}`, form)
        : await api.post('/api/branches', form)

      if (res.data.success) {
        toast.success(branch ? 'Branch updated!' : 'Branch added!')
        onSaved()
      }
    } catch {
      toast.error('Failed to save branch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {branch ? 'Edit Branch' : 'Add New Branch'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Branch Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Main Office, Feed Store Branch"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Branch address"
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Phone Number
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 08012345678"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_main"
              id="is_main"
              checked={form.is_main}
              onChange={handleChange}
              className="w-4 h-4 accent-green-600"
            />
            <label htmlFor="is_main" className="text-sm text-gray-600">
              This is the main branch
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="w-4 h-4 accent-green-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-600">
              Branch is active
            </label>
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
              {saving ? 'Saving...' : branch ? 'Update Branch' : 'Add Branch'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Branches