import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Truck, Phone, Mail, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/suppliers')
      if (res.data.success) setSuppliers(res.data.data)
    } catch {
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSuppliers() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return
    try {
      const res = await api.delete(`/api/suppliers/${id}`)
      if (res.data.success) {
        toast.success('Supplier deleted')
        fetchSuppliers()
      }
    } catch {
      toast.error('Failed to delete supplier')
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{suppliers.length} suppliers registered</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Supplier
        </button>
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Truck size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No suppliers yet</p>
          <p className="text-gray-300 text-sm mt-1">Click "Add Supplier" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

              {/* Supplier Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Truck size={18} className="text-blue-500" />
                  </div>
                  <p className="font-semibold text-gray-800">{supplier.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(supplier); setShowModal(true) }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Supplier Details */}
              <div className="space-y-2">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} className="text-gray-400" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} className="text-gray-400" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SupplierModal
          supplier={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchSuppliers()
          }}
        />
      )}

    </div>
  )
}

function SupplierModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) {
      toast.error('Supplier name is required')
      return
    }
    setSaving(true)
    try {
      const res = supplier
        ? await api.put(`/api/suppliers/${supplier.id}`, form)
        : await api.post('/api/suppliers', form)

      if (res.data.success) {
        toast.success(supplier ? 'Supplier updated!' : 'Supplier added!')
        onSaved()
      }
    } catch {
      toast.error('Failed to save supplier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Supplier Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Cargill Nigeria Ltd"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
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

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. supplier@example.com"
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
              placeholder="Supplier address"
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
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
              {saving ? 'Saving...' : supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Suppliers