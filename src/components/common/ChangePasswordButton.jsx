import { useState } from 'react'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'
import api from '../../services/api'

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400'
const EMPTY = { current: '', next: '', confirm: '' }

function ChangePasswordButton() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const close = () => {
    setOpen(false)
    setForm(EMPTY)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.next.length < 8) return toast.error('New password must be at least 8 characters')
    if (form.next !== form.confirm) return toast.error('The new passwords do not match')
    setSaving(true)
    try {
      await api.put('/api/auth/change-password', {
        current_password: form.current,
        new_password: form.next,
      })
      toast.success('Password changed')
      close()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition w-full px-3 py-2 rounded-xl hover:bg-gray-50"
      >
        <Lock size={16} />
        Change password
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Change password</h2>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Current password</label>
              <input type="password" autoComplete="current-password" value={form.current}
                onChange={(e) => setForm({ ...form, current: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">New password</label>
              <input type="password" autoComplete="new-password" value={form.next}
                onChange={(e) => setForm({ ...form, next: e.target.value })} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">At least 8 characters.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
              <input type="password" autoComplete="new-password" value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })} className={inputClass} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default ChangePasswordButton