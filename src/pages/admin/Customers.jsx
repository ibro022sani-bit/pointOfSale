import { useState, useEffect } from 'react'
import { Plus, Edit2, Search, User, Phone, Mail, MapPin, Wallet, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import { refreshCustomerCache, searchLocalCustomers as searchCachedCustomers, queueCustomerEdit } from '../../services/offlineSync'
import db from '../../db'

function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { online } = useOnlineStatus()

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      if (!online) {
        const cached = await db.customer_cache.toArray()
        setCustomers(cached)
        return
      }
      const res = await api.get('/api/customers')
      if (res.data.success) {
        setCustomers(res.data.data)
        refreshCustomerCache()
      }
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [])

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.outstanding_balance || 0), 0)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} customers · ₦{totalOutstanding.toLocaleString()} outstanding
          </p>
        </div>
        <button
          onClick={() => {
            if (!online) {
              toast.error('Adding a new customer needs an internet connection')
              return
            }
            setEditing(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <User size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No customers yet</p>
          <p className="text-gray-300 text-sm mt-1">Click "Add Customer" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <Link
              to={`/admin/customers/${customer.id}`}
              key={customer.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <User size={18} className="text-green-600" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-gray-800">{customer.name}</p>
                    {customer.is_special_customer && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Star size={9} /> Special
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setEditing(customer)
                    setShowModal(true)
                  }}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 size={14} />
                </button>
              </div>

              <div className="space-y-2 mb-3">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} className="text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} className="text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{customer.address}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Wallet size={13} />
                  Outstanding
                </div>
                <span className={`text-sm font-semibold ${Number(customer.outstanding_balance) > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                  ₦{Number(customer.credit_account?.current_balance || customer.outstanding_balance || 0).toLocaleString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <CustomerModal
          customer={editing}
          online={online}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchCustomers()
          }}
        />
      )}

    </div>
  )
}

function CustomerModal({ customer, online, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    credit_limit: customer?.credit_limit || '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) {
      toast.error('Name and phone number are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        email: form.email || null,
        address: form.address || null,
        credit_limit: form.credit_limit ? Number(form.credit_limit) : 0,
      }

      if (!online && customer) {
        await queueCustomerEdit(customer.id, payload)
        toast.success('Saved offline — will sync once reconnected')
        onSaved()
        return
      }

      const res = customer
        ? await api.put(`/api/customers/${customer.id}`, payload)
        : await api.post('/api/customers', payload)

      if (res.data.success) {
        toast.success(customer ? 'Customer updated!' : 'Customer added!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer')
      console.error('Customer save error:', err.response?.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {customer ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Customer Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Ibrahim Musa"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number *</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 08012345678"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. customer@example.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Customer address"
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Credit Limit (₦)</label>
            <input
              name="credit_limit"
              type="number"
              value={form.credit_limit}
              onChange={handleChange}
              placeholder="e.g. 50000"
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
              {saving ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Customers