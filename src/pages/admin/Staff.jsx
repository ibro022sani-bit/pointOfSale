import { useState, useEffect } from 'react'
import { Plus, Edit2, Users, Phone, Mail, GitBranch } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  cashier: 'bg-green-100 text-green-700',
}

function Staff() {
  const [staff, setStaff] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const fetchData = async () => {
    setLoading(true)
    try {
      const [staffRes, branchRes] = await Promise.all([
        api.get('/api/staff'),
        api.get('/api/branches'),
      ])
      if (staffRes.data.success) setStaff(staffRes.data.data)
      if (branchRes.data.success) setBranches(branchRes.data.data)
    } catch {
      toast.error('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleToggleActive = async (member) => {
    try {
      const endpoint = member.is_active
        ? `/api/staff/${member.id}/deactivate`
        : `/api/staff/${member.id}/activate`
      const res = await api.put(endpoint)
      if (res.data.success) {
        toast.success(member.is_active ? 'Staff deactivated' : 'Staff activated')
        fetchData()
      }
    } catch {
      toast.error('Failed to update staff status')
    }
  }

  const getBranchName = (branchId) => {
    const branch = branches.find((b) => b.id === branchId)
    return branch ? branch.name : 'No Branch'
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff.length} staff members</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Staff
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Users size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No staff members yet</p>
          <p className="text-gray-300 text-sm mt-1">Click "Add Staff" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((member) => (
            <div key={member.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

              {/* Staff Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">
                      {member.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{member.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg capitalize ${roleColors[member.role]}`}>
                      {member.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setEditing(member); setShowModal(true) }}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit2 size={14} />
                </button>
              </div>

              {/* Staff Details */}
              <div className="space-y-2">
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} className="text-gray-400" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} className="text-gray-400" />
                    <span>{member.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <GitBranch size={14} className="text-gray-400" />
                  <span>{getBranchName(member.branch_id)}</span>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                  member.is_active
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-500'
                }`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => handleToggleActive(member)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                    member.is_active
                      ? 'bg-red-50 text-red-500 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {member.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <StaffModal
          member={editing}
          branches={branches}
          isSuperAdmin={isSuperAdmin}
          currentUserBranchId={user?.branch_id}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchData()
          }}
        />
      )}

    </div>
  )
}

function StaffModal({ member, branches, isSuperAdmin, currentUserBranchId, onClose, onSaved }) {
  const availableRoles = isSuperAdmin ? ['super_admin', 'admin', 'cashier'] : ['cashier']

  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role: member?.role || (isSuperAdmin ? 'cashier' : 'cashier'),
    branch_id: member?.branch_id || (isSuperAdmin ? '' : currentUserBranchId || ''),
    password: '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email) {
      toast.error('Name and email are required')
      return
    }
    if (!member && !form.password) {
      toast.error('Password is required for new staff')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      // Admin can't change branch anyway (backend forces it), but strip it
      // client-side too so the intent is clear.
      if (!isSuperAdmin) delete payload.branch_id

      const res = member
        ? await api.put(`/api/staff/${member.id}`, payload)
        : await api.post('/api/staff', payload)

      if (res.data.success) {
        toast.success(member ? 'Staff updated!' : 'Staff added!')
        onSaved()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save staff')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {member ? 'Edit Staff' : 'Add New Staff'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Full Name *
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Aliyu Hassan"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Email Address *
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. youremail@sadeeqagrovet.com"
              autoComplete="off"
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
              Role *
            </label>
            {isSuperAdmin ? (
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r} className="capitalize">{r.replace('_', ' ')}</option>
                ))}
              </select>
            ) : (
              <input
                value="Cashier"
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
            )}
            {!isSuperAdmin && (
              <p className="text-xs text-gray-400 mt-1">Admins can only create cashier accounts.</p>
            )}
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Assign to Branch
              </label>
              <select
                name="branch_id"
                value={form.branch_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_main ? '(Main)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {member ? 'New Password (leave empty to keep current)' : 'Password *'}
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              autoComplete="new-password"
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
              {saving ? 'Saving...' : member ? 'Update Staff' : 'Add Staff'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Staff