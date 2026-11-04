import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import { whatsappLink } from '../../lib/contact'
import { APP_NAME } from '../../config/brand'

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—')
const rewardLabel = (type, value) => {
  if (!type) return '—'
  if (type === 'months') return `${Number(value)} month${Number(value) === 1 ? '' : 's'} free`
  return naira(value)
}
const referralLink = (code) => `${window.location.origin}/signup?ref=${code}`
const portalLink = (token) => `${window.location.origin}/r/${token}`

const STATUS_STYLES = {
  waiting: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
const STATUS_TEXT = {
  waiting: 'Waiting for first payment',
  pending: 'Owed to referrer',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm'
const EMPTY_FORM = { name: '', phone: '', linked_tenant_id: '', reward_type: 'money', reward_value: '', note: '', is_active: true }

function Referrals() {
  const [tab, setTab] = useState('referrers')
  const [referrers, setReferrers] = useState([])
  const [referrals, setReferrals] = useState([])
  const [tenants, setTenants] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState(null) // referrer being added or edited
  const [payout, setPayout] = useState(null) // referral being paid
  const [payoutRef, setPayoutRef] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [a, b, c] = await Promise.all([
        api.get('/api/platform/referrals/referrers'),
        api.get('/api/platform/referrals'),
        api.get('/api/platform/tenants'),
      ])
      setReferrers(a.data.data)
      setReferrals(b.data.data)
      setTenants(c.data.data)
    } catch {
      toast.error('Could not load referrals')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openAdd = () => setForm({ ...EMPTY_FORM })
  const openEdit = (r) =>
    setForm({
      id: r.id, name: r.name, phone: r.phone, linked_tenant_id: r.linked_tenant_id || '',
      reward_type: r.reward_type, reward_value: String(r.reward_value), note: r.note || '', is_active: r.is_active,
    })

  const saveReferrer = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone number are required')
    setSaving(true)
    try {
      const payload = {
        name: form.name, phone: form.phone, linked_tenant_id: form.linked_tenant_id || null,
        reward_type: form.reward_type, reward_value: Number(form.reward_value || 0), note: form.note,
        ...(form.id ? { is_active: form.is_active } : {}),
      }
      if (form.id) await api.put(`/api/platform/referrals/referrers/${form.id}`, payload)
      else await api.post('/api/platform/referrals/referrers', payload)
      toast.success(form.id ? 'Referrer updated' : 'Referrer added')
      setForm(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = (r) =>
    navigator.clipboard.writeText(referralLink(r.code)).then(() => toast.success('Link copied'))

  const copyPortal = (r) =>
    navigator.clipboard.writeText(portalLink(r.access_token)).then(() => toast.success('Page link copied'))

  const shareLink = (r) => {
    const earn = Number(r.reward_value) > 0
      ? `\n\nWhen a business you refer signs up and makes its first payment, you earn ${rewardLabel(r.reward_type, r.reward_value)}.`
      : ''
    const message = `Hi ${r.name}, here is your ${APP_NAME} referral link: ${referralLink(r.code)}\n\nShare it with business owners.${earn}\n\nTrack your referrals and earnings here: ${portalLink(r.access_token)}`
    const link = whatsappLink(r.phone, message)
    if (!link) return toast.error('This referrer has no valid phone number')
    window.open(link, '_blank', 'noopener')
  }

  const markPaid = async () => {
    setSaving(true)
    try {
      await api.put(`/api/platform/referrals/${payout.id}/pay`, { payout_reference: payoutRef })
      toast.success('Marked as paid')
      setPayout(null)
      setPayoutRef('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update')
    } finally {
      setSaving(false)
    }
  }

  const cancelReward = async (r) => {
    if (!confirm('Cancel this reward? The referrer will not receive it.')) return
    try {
      await api.put(`/api/platform/referrals/${r.id}/cancel`, {})
      toast.success('Reward cancelled')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel')
    }
  }

  const shownReferrals = referrals.filter((r) => filter === 'all' || r.reward_status === filter)
  const owedTotal = referrers.reduce((s, r) => s + r.stats.owed_money, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Referrals</h1>
          <p className="text-xs text-gray-500">Referrers, rewards and payouts</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-800" title="Refresh"><RefreshCw size={18} /></button>
          <Link to="/platform" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} /> Businesses
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[['referrers', 'Referrers'], ['referrals', 'Referrals']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm border ${tab === key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {label}
            </button>
          ))}
          {owedTotal > 0 && (
            <span className="ml-auto text-sm bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">
              Total owed to referrers: <b>{naira(owedTotal)}</b>
            </span>
          )}
          {tab === 'referrers' && (
            <button onClick={openAdd} className={`${owedTotal > 0 ? '' : 'ml-auto'} bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg`}>
              Add referrer
            </button>
          )}
        </div>

        {tab === 'referrers' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Referrals</th>
                  <th className="px-4 py-3">Owed / Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
                {!loading && referrers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No referrers yet</td></tr>}
                {referrers.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.name}{!r.is_active && <span className="ml-2 text-xs text-red-500">inactive</span>}</p>
                      <p className="text-xs text-gray-400">{r.phone}</p>
                      {r.linked_tenant_name && <p className="text-xs text-gray-400">Business: {r.linked_tenant_name}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{r.code}</td>
                    <td className="px-4 py-3 text-gray-700">{rewardLabel(r.reward_type, r.reward_value)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.stats.total}
                      {r.stats.waiting > 0 && <span className="text-xs text-gray-400"> ({r.stats.waiting} waiting)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.stats.owed_money > 0 && <p className="text-amber-700">Owed {naira(r.stats.owed_money)}</p>}
                      {r.stats.paid_money > 0 && <p>Paid {naira(r.stats.paid_money)}</p>}
                      {r.stats.paid_months > 0 && <p>{r.stats.paid_months} month(s) applied</p>}
                      {!r.stats.owed_money && !r.stats.paid_money && !r.stats.paid_months && '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => shareLink(r)} className="text-xs text-green-700 hover:underline mr-3">WhatsApp link</button>
                      <button onClick={() => copyLink(r)} className="text-xs text-gray-500 hover:text-gray-800 mr-3">Copy link</button>
                      <button onClick={() => copyPortal(r)} className="text-xs text-gray-500 hover:text-gray-800 mr-3">Copy page link</button>
                      <button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'referrals' && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {['all', 'waiting', 'pending', 'paid', 'cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs border capitalize ${filter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {s === 'pending' ? 'owed' : s}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-4 py-3">Referred business</th>
                    <th className="px-4 py-3">Referrer</th>
                    <th className="px-4 py-3">Reward</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && shownReferrals.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No referrals</td></tr>}
                  {shownReferrals.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{r.referred?.name || '—'}</p>
                        <p className="text-xs text-gray-400">Signed up {fmt(r.created_at)} · {r.referred?.status}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.referrer?.name || '—'}<p className="text-xs font-mono text-gray-400">{r.referrer?.code}</p></td>
                      <td className="px-4 py-3 text-gray-700">{rewardLabel(r.reward_type, r.reward_value)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[r.reward_status]}`}>{STATUS_TEXT[r.reward_status]}</span>
                        {r.paid_at && <p className="text-xs text-gray-400 mt-1">{fmt(r.paid_at)}{r.payout_reference ? ` · ${r.payout_reference}` : ''}</p>}
                        {r.note && <p className="text-xs text-gray-400 mt-1">{r.note}</p>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r.reward_status === 'pending' && r.reward_type === 'money' && (
                          <button onClick={() => { setPayout(r); setPayoutRef('') }} className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg mr-2">
                            Mark paid
                          </button>
                        )}
                        {['waiting', 'pending'].includes(r.reward_status) && (
                          <button onClick={() => cancelReward(r)} className="text-xs text-red-500 hover:underline">Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Add / edit referrer */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800">{form.id ? 'Edit referrer' : 'Add referrer'}</h2>

            <label className="block text-sm text-gray-600 mt-4 mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />

            <label className="block text-sm text-gray-600 mt-3 mb-1">Phone (used for WhatsApp)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />

            <label className="block text-sm text-gray-600 mt-3 mb-1">Their business (optional)</label>
            <select
              value={form.linked_tenant_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  linked_tenant_id: e.target.value,
                  reward_type: e.target.value ? form.reward_type : 'money',
                })
              }
              className={inputClass}
            >
              <option value="">None (not a business owner)</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reward type</label>
                <select value={form.reward_type} onChange={(e) => setForm({ ...form, reward_type: e.target.value })} className={inputClass}>
                  <option value="money">Money (₦)</option>
                  <option value="months" disabled={!form.linked_tenant_id}>Free months</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{form.reward_type === 'months' ? 'Months' : 'Amount (₦)'}</label>
                <input type="number" min="0" value={form.reward_value} onChange={(e) => setForm({ ...form, reward_value: e.target.value })} className={inputClass} />
              </div>
            </div>
            {!form.linked_tenant_id && <p className="text-xs text-gray-400 mt-1">Free months are only available when the referrer has a business here.</p>}

            <label className="block text-sm text-gray-600 mt-3 mb-1">Note (only you see this)</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} />

            {form.id && (
              <label className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active (can be used on new signups)
              </label>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveReferrer} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark paid */}
      {payout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-800">Mark as paid</h2>
            <p className="text-sm text-gray-500 mt-1">
              {rewardLabel(payout.reward_type, payout.reward_value)} to {payout.referrer?.name}
            </p>
            <label className="block text-sm text-gray-600 mt-4 mb-1">Payment reference (optional)</label>
            <input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} placeholder="e.g. transfer reference" className={inputClass} />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPayout(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={markPaid} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Referrals