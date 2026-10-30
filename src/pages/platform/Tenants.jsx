import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, Check, Ban, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—')
const isOverdue = (t) => t.status === 'active' && t.paid_until && new Date(t.paid_until) < new Date()

function Tenants() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null) // { tenant, status }
  const [paidUntil, setPaidUntil] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/platform/tenants')
      setTenants(res.data.data)
    } catch {
      toast.error('Could not load businesses')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openModal = (tenant, status) => {
    setModal({ tenant, status })
    setPaidUntil(tenant.paid_until ? tenant.paid_until.slice(0, 10) : '')
    setNote(tenant.status_note || '')
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/api/platform/tenants/${modal.tenant.id}`, {
        status: modal.status,
        paid_until: paidUntil || null,
        note,
      })
      toast.success(modal.status === 'active' ? 'Business activated' : 'Business deactivated')
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update')
    } finally {
      setSaving(false)
    }
  }

  const shown = tenants.filter((t) => filter === 'all' || t.status === filter)
  const pendingCount = tenants.filter((t) => t.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Businesses</h1>
          <p className="text-xs text-gray-500">Platform control panel</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-800" title="Refresh"><RefreshCw size={18} /></button>
          <button onClick={() => { logout(); navigate('/login') }} className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'pending', 'active', 'suspended'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm capitalize border ${filter === f ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {f}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid until</th>
                <th className="px-4 py-3">Signed up</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No businesses</td></tr>}
              {shown.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{t.name}</p>
                    {t.status_note && <p className="text-xs text-gray-400 mt-0.5">{t.status_note}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.owner ? (<><p>{t.owner.name}</p><p className="text-xs text-gray-400">{t.owner.email}{t.owner.phone ? ` · ${t.owner.phone}` : ''}</p></>) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[t.status] || ''}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={isOverdue(t) ? 'text-red-600 font-medium' : 'text-gray-600'}>{fmt(t.paid_until)}</span>
                    {isOverdue(t) && <span className="ml-2 text-xs text-red-600">overdue</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(t.created_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {t.status !== 'active' ? (
                      <button onClick={() => openModal(t, 'active')} className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                        <Check size={14} /> {t.status === 'pending' ? 'Activate' : 'Reactivate'}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => openModal(t, 'active')} className="text-xs text-gray-500 hover:text-gray-800 mr-3">Edit</button>
                        <button onClick={() => openModal(t, 'suspended')} className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                          <Ban size={14} /> Deactivate
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              {modal.status === 'active' ? 'Activate' : 'Deactivate'} {modal.tenant.name}
            </h2>
            {modal.status === 'suspended' && (
              <p className="text-sm text-gray-500 mt-2">All their staff will be locked out within about 30 seconds.</p>
            )}
            <label className="block text-sm text-gray-600 mt-4 mb-1">Paid until</label>
            <input type="date" value={paidUntil} onChange={(e) => setPaidUntil(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <label className="block text-sm text-gray-600 mt-3 mb-1">Note (only you see this)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid ₦20,000 by transfer" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 ${modal.status === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tenants