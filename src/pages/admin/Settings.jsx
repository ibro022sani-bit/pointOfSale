import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

const inputClass =
  'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent'

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—')

function Settings() {
  const { tenant, setTenant } = useAuthStore()
  const [form, setForm] = useState({ name: '', phone: '', address: '', receipt_footer: '' })
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/settings/business')
        const b = res.data.data
        setInfo(b)
        setForm({
          name: b.name || '',
          phone: b.phone || '',
          address: b.address || '',
          receipt_footer: b.receipt_footer || '',
        })
      } catch {
        toast.error('Could not load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Business name is required')
    setSaving(true)
    try {
      const res = await api.put('/api/settings/business', form)
      if (res.data.success) {
        setTenant({ ...tenant, ...res.data.data })
        toast.success('Business profile saved')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500">These details appear on your receipts and messages.</p>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Business name</label>
          <input value={form.name} onChange={update('name')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
          <input value={form.phone} onChange={update('phone')} className={inputClass} placeholder="Shown on receipts" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
          <input value={form.address} onChange={update('address')} className={inputClass} placeholder="Shown on receipts" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Receipt footer</label>
          <textarea
            value={form.receipt_footer}
            onChange={update('receipt_footer')}
            rows={3}
            className={inputClass}
            placeholder={'Thank you for your patronage!\nGoods sold are not returnable'}
          />
          <p className="text-xs text-gray-400 mt-1">Printed at the bottom of every receipt. Press Enter for a new line.</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {info && (
        <div className="bg-white rounded-2xl border p-6 space-y-3 text-sm">
          <h2 className="font-semibold text-gray-800">Your subscription</h2>
          <div className="flex justify-between">
            <span className="text-gray-500">Account status</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[info.status] || ''}`}>
              {info.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Paid until</span>
            <span className="text-gray-800">{fmtDate(info.paid_until)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">SMS sender name</span>
            <span className="text-gray-800">{info.sms_sender_id || 'Default'}</span>
          </div>
          <p className="text-xs text-gray-400">To change your SMS sender name or subscription, please contact support.</p>
        </div>
      )}
    </div>
  )
}

export default Settings