import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'

function SupplierDebtSummary() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get('/api/reports/supplier-debt')
        if (res.data.success) setData(res.data.data)
      } catch {
        toast.error('Failed to load supplier debt summary')
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [])

  return (
    <div className="space-y-4">
      <Link to="/admin/reports" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition w-fit">
        <ArrowLeft size={16} /> Back to Reports
      </Link>

      <h1 className="text-xl font-bold text-gray-800">Supplier Debt Summary</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-gray-400 text-center py-10">No data</p>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Total Owed to Suppliers</p>
            <p className="text-2xl font-bold text-red-500">₦{Number(data.total_outstanding || 0).toLocaleString()}</p>
          </div>

          {data.suppliers?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium text-right">Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suppliers.map((s, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-gray-800">{s.supplier_name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">₦{Number(s.outstanding || 0).toLocaleString()}</td>
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

export default SupplierDebtSummary