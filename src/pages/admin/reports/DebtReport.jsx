import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import ContactButtons from '../../../components/common/ContactButtons'

const lastReminder = (account) => {
  const r = account.customers?.debt_reminders
  return Array.isArray(r) ? r[0]?.last_sent_at : r?.last_sent_at
}

const fmtLast = (d) => {
  if (!d) return 'Never'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function DebtReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const markReminded = (customerId) => {
    const now = new Date().toISOString()
    setData((d) => ({
      ...d,
      accounts: d.accounts.map((a) =>
        a.customer_id === customerId
          ? { ...a, customers: { ...a.customers, debt_reminders: { last_sent_at: now } } }
          : a
      ),
    }))
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition w-fit">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      <h1 className="text-xl font-bold text-gray-800">Debt Report</h1>

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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium text-right">Balance</th>
                    <th className="px-4 py-3 font-medium text-right">Limit</th>
                    <th className="px-4 py-3 font-medium">Last reminded</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((a) => (
                    <tr key={a.customer_id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{a.customers?.name}</p>
                        <p className="text-xs text-gray-400">{a.customers?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">₦{Number(a.current_balance || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-600">₦{Number(a.credit_limit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtLast(lastReminder(a))}</td>
                      <td className="px-4 py-3">
                        <ContactButtons
                          customerId={a.customer_id}
                          name={a.customers?.name}
                          phone={a.customers?.phone}
                          balance={a.current_balance}
                          onContacted={() => markReminded(a.customer_id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DebtReport