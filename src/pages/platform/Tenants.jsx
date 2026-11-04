import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, Check, Ban, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

const DAY = 24 * 60 * 60 * 1000
const GRACE_DAYS = 3 // keep in step with GRACE_DAYS in backend/lib/subscription.js

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  deactivated: 'bg-red-100 text-red-700',
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—')
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`
const isOverdue = (t) => t.status === 'active' && t.paid_until && new Date(t.paid_until) < new Date()
const isDueSoon = (t) =>
  t.status === 'active' && t.paid_until && new Date(t.paid_until) < new Date(Date.now() + 7 * DAY)

const addMonths = (date, n) => {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + n)
  if (d.getDate() < day) d.setDate(0)
  return d
}
const previewEnd = (tenant, months) => {
  const now = new Date()
  const start = tenant.paid_until && new Date(tenant.paid_until) > now ? new Date(tenant.paid_until) : now
  return addMonths(start, months)
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
const EMPTY_PAY = { amount: '', months: 1, payment_method: 'transfer', reference: '', note: '' }

function Tenants() {
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // activate / deactivate window
  const [modal, setModal] = useState(null) // { tenant, status }
  const [paidUntil, setPaidUntil] = useState('')
  const [note, setNote] = useState('')

  // record payment window
  const [payModal, setPayModal] = useState(null) // tenant
  const [pay, setPay] = useState(EMPTY_PAY)

  // payment history window
  const [history, setHistory] = useState(null) // { tenant, rows }

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

  const openStatusModal = (tenant, status) => {
    setModal({ tenant, status })
    // Only pre-fill a date that is still usable; an old one would just run out again
    const stillValid = tenant.paid_until && new Date(tenant.paid_until).getTime() + GRACE_DAYS * DAY > Date.now()
    setPaidUntil(stillValid ? tenant.paid_until.slice(0, 10) : '')
    const existing = tenant.status_note || ''
    setNote(existing.startsWith('Automatically deactivated') ? '' : existing)
  }

  const saveStatus = async () => {
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

  const savePayment = async () => {
    if (!(Number(pay.amount) > 0)) return toast.error('Enter the amount received')
    setSaving(true)
    try {
      const paymentRes = await api.post(`/api/platform/tenants/${payModal.id}/payments`, {
        ...pay,
        amount: Number(pay.amount),
        months: Number(pay.months),
      })
      toast.success('Payment recorded. Account is active.')
      const ref = paymentRes.data?.data?.referral
      if (ref && ref.reward_status !== 'cancelled') {
        toast.success(
          ref.reward_status === 'paid'
            ? 'Referral reward applied to the referrer.'
            : 'A referral reward is now waiting to be paid out. See Referrals.'
        )
      }
      setPayModal(null)
      setPay(EMPTY_PAY)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record payment')
    } finally {
      setSaving(false)
    }
  }

  const openHistory = async (tenant) => {
    setHistory({ tenant, rows: null })
    try {
      const res = await api.get(`/api/platform/tenants/${tenant.id}/payments`)
      setHistory({ tenant, rows: res.data.data })
    } catch {
      toast.error('Could not load payment history')
      setHistory(null)
    }
  }

  const shown = tenants.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'due') return isDueSoon(t)
    return t.status === filter
  })
  const pendingCount = tenants.filter((t) => t.status === 'pending').length
  const dueCount = tenants.filter(isDueSoon).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Businesses</h1>
          <p className="text-xs text-gray-500">Platform control panel</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/platform/referrals" className="text-sm font-medium text-green-700 hover:underline">Referrals</Link>
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-800" title="Refresh"><RefreshCw size={18} /></button>
          <button onClick={() => { logout(); navigate('/login') }} className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            ['all', 'All'],
            ['pending', `Pending${pendingCount ? ` (${pendingCount})` : ''}`],
            ['active', 'Active'],
            ['due', `Due soon${dueCount ? ` (${dueCount})` : ''}`],
            ['deactivated', 'Deactivated'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm border ${filter === key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {label}
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
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No businesses</td></tr>}
              {shown.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Signed up {fmt(t.created_at)}</p>
                    {t.status_note && <p className="text-xs text-gray-400">{t.status_note}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.owner ? (<><p>{t.owner.name}</p><p className="text-xs text-gray-400">{t.owner.email}{t.owner.phone ? ` · ${t.owner.phone}` : ''}</p></>) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[t.status] || ''}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={isOverdue(t) ? 'text-red-600 font-medium' : isDueSoon(t) ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                      {fmt(t.paid_until)}
                    </span>
                    {isOverdue(t) && <span className="ml-2 text-xs text-red-600">overdue</span>}
                    {!isOverdue(t) && isDueSoon(t) && <span className="ml-2 text-xs text-amber-600">due soon</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => { setPayModal(t); setPay(EMPTY_PAY) }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium mr-2"
                    >
                      Record payment
                    </button>
                    <button onClick={() => openHistory(t)} className="text-xs text-gray-500 hover:text-gray-800 mr-3">
                      History
                    </button>
                    {t.status === 'active' ? (
                      <>
                        <button onClick={() => openStatusModal(t, 'active')} className="text-xs text-gray-500 hover:text-gray-800 mr-3">Edit</button>
                        <button onClick={() => openStatusModal(t, 'deactivated')} className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                          <Ban size={14} /> Deactivate
                        </button>
                      </>
                    ) : (
                      <button onClick={() => openStatusModal(t, 'active')} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                        <Check size={14} /> Activate without payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Record payment */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-800">Record payment</h2>
            <p className="text-sm text-gray-500">{payModal.name}</p>

            <label className="block text-sm text-gray-600 mt-4 mb-1">Amount received (₦)</label>
            <input type="number" min="0" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={inputClass} />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Months covered</label>
                <input type="number" min="1" max="36" value={pay.months} onChange={(e) => setPay({ ...pay, months: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Method</label>
                <select value={pay.payment_method} onChange={(e) => setPay({ ...pay, payment_method: e.target.value })} className={inputClass}>
                  <option value="transfer">Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="pos">POS</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <label className="block text-sm text-gray-600 mt-3 mb-1">Reference (optional)</label>
            <input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} className={inputClass} placeholder="Transfer reference or receipt no." />

            <label className="block text-sm text-gray-600 mt-3 mb-1">Note (optional)</label>
            <input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} className={inputClass} />

            {Number(pay.months) >= 1 && (
              <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">
                Account will be <b>active until {fmt(previewEnd(payModal, Number(pay.months)))}</b>
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPayModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={savePayment} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment history */}
      {history && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Payment history</h2>
                <p className="text-sm text-gray-500">{history.tenant.name}</p>
              </div>
              <button onClick={() => setHistory(null)} className="text-sm text-gray-500 hover:text-gray-800">Close</button>
            </div>
            {history.rows === null && <p className="text-sm text-gray-400 mt-6">Loading…</p>}
            {history.rows && history.rows.length === 0 && <p className="text-sm text-gray-400 mt-6">No payments recorded yet.</p>}
            {history.rows && history.rows.length > 0 && (
              <>
                <p className="text-sm text-gray-600 mt-4">
                  Total received: <b>{naira(history.rows.reduce((s, r) => s + Number(r.amount), 0))}</b>
                </p>
                <table className="w-full text-sm mt-3">
                  <thead className="text-gray-500 text-left">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Covers</th>
                      <th className="py-2 pr-3">Method</th>
                      <th className="py-2">Reference / note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.created_at)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{naira(r.amount)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.months} mo → {fmt(r.period_end)}</td>
                        <td className="py-2 pr-3 capitalize">{r.payment_method}</td>
                        <td className="py-2 text-gray-500">{[r.reference, r.note].filter(Boolean).join(' · ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* Activate / deactivate */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              {modal.status === 'active' ? 'Activate' : 'Deactivate'} {modal.tenant.name}
            </h2>
            {modal.status === 'deactivated' && (
              <p className="text-sm text-gray-500 mt-2">All their staff will be locked out within about 30 seconds.</p>
            )}
            {modal.status === 'active' && (
              <p className="text-sm text-gray-500 mt-2">
                This activates the account without recording a payment. To record money received, use “Record payment” instead.
              </p>
            )}
            <label className="block text-sm text-gray-600 mt-4 mb-1">Paid until</label>
            <input type="date" value={paidUntil} onChange={(e) => setPaidUntil(e.target.value)} className={inputClass} />
            {modal.status === 'active' && (
              <p className="text-xs text-gray-400 mt-1">Leave empty and this business will never expire.</p>
            )}
            <label className="block text-sm text-gray-600 mt-3 mb-1">Note (only you see this)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Free pilot, or reason for deactivation" className={inputClass} />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={saveStatus}
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