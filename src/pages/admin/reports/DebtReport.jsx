import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import useAuthStore from '../../../store/authStore'

function DebtReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [showCompose, setShowCompose] = useState(false)
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get('/api/reports/debt')
        if (res.data.success) setData(res.data.data)
      } catch {
        toast.error('Failed to load debt report')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  const toggleSelect = (customerId) => {
    setSelected((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    )
  }

  const toggleSelectAll = () => {
    if (!data?.accounts) return
    if (selected.length === data.accounts.length) {
      setSelected([])
    } else {
      setSelected(data.accounts.map((a) => a.customer_id))
    }
  }

  const selectedCustomers = data?.accounts?.filter((a) => selected.includes(a.customer_id)) || []

  return (
    <div className="space-y-4">
      <Link to="/admin/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition w-fit">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Debt Report</h1>
        {isSuperAdmin && selected.length > 0 && (
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <MessageSquare size={16} />
            Message {selected.length} Selected
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-gray-400 text-center py-10">No data</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-500">₦{Number(data.total_outstanding || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-1">Customers with Debt</p>
              <p className="text-2xl font-bold text-gray-800">{data.customers_with_debt || 0}</p>
            </div>
          </div>

          {data.accounts?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    {isSuperAdmin && (
                      <th className="px-4 py-3 font-medium">
                        <input
                          type="checkbox"
                          checked={selected.length === data.accounts.length}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-right">Balance</th>
                    <th className="px-4 py-3 font-medium text-right">Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((a, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(a.customer_id)}
                            onChange={() => toggleSelect(a.customer_id)}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-800">{a.customers?.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">₦{Number(a.current_balance || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-600">₦{Number(a.credit_limit || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showCompose && (
        <ComposeSmsModal
          customers={selectedCustomers}
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false)
            setSelected([])
          }}
        />
      )}
    </div>
  )
}

function ComposeSmsModal({ customers, onClose, onSent }) {
  const [message, setMessage] = useState('Please settle your outstanding balance.')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState(null)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!message.trim()) {
      toast.error('Enter a message')
      return
    }
    setSending(true)
    try {
      const res = await api.post('/api/notifications/sms/bulk', {
        customer_ids: customers.map((c) => c.customer_id),
        message,
      })
      if (res.data.success) {
        setResults(res.data.data)
        toast.success(`Sent to ${res.data.data.sent_count} of ${customers.length}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send messages')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {results ? 'Send Results' : `Message ${customers.length} Customers`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {!results ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 max-h-24 overflow-y-auto">
              <p className="text-xs text-gray-500">
                {customers.map((c) => c.customers?.name).filter(Boolean).join(', ')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
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
                disabled={sending}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send SMS'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Sent</p>
                <p className="text-xl font-bold text-green-600">{results.sent_count}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Failed</p>
                <p className="text-xl font-bold text-red-500">{results.failed_count}</p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {results.results.map((r, i) => (
                <div key={i} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
                  r.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <span className="text-gray-700">{r.customer_name}</span>
                  <span className={r.success ? 'text-green-600' : 'text-red-500'}>
                    {r.success ? 'Sent' : r.reason}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={onSent}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default DebtReport