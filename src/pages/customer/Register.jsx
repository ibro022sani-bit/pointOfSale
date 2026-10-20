import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

function CustomerRegister() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.password) {
      toast.error('Name, phone and password are required')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      const payload = { name: form.name, phone: form.phone, password: form.password }
      if (form.email) payload.email = form.email

      const res = await api.post('/api/auth/customer/register', payload)
      const { token, user } = res.data.data
      login(user, token)
      toast.success(`Welcome, ${user.name}!`)
      navigate('/customer/balance')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg font-bold">SA</span>
          </div>
          <h1 className="text-lg font-bold text-gray-800">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Sadeeq Agrovet Customer Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Full Name *</label>
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
            <p className="text-xs text-gray-400 mt-1">
              If you've bought from us before, use the same phone number on file.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Optional"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Password *</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Confirm Password *</label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
          >
            {saving ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/customer/login" className="text-green-600 font-medium hover:text-green-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default CustomerRegister