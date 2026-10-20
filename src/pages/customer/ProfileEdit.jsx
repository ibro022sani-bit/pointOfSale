import { useState } from 'react'
import { User, Mail, Lock, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

function ProfileEdit() {
  const { user, updateUser } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await api.put('/api/customers/me', { name, email })
      if (res.data.success) {
        updateUser({ name: res.data.data.name, email: res.data.data.email })
        toast.success('Profile updated')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setSavingPassword(true)
    try {
      const res = await api.put('/api/customers/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      if (res.data.success) {
        toast.success('Password updated')
        setCurrentPassword('')
        setNewPassword('')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-800">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your details</p>
      </div>

      <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-800">Profile Info</p>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
          <input
            value={user?.phone || ''}
            disabled
            className="w-full px-4 py-2.5 border border-gray-100 bg-gray-50 rounded-xl text-sm text-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">Phone number can't be changed</p>
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
        >
          <Save size={16} />
          {savingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-800">Change Password</p>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Current Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
        >
          <Save size={16} />
          {savingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

export default ProfileEdit