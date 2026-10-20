import { Link } from 'react-router-dom'
import { TrendingUp, Package, Wallet, Receipt, PieChart, Truck, Users } from 'lucide-react'
import useAuthStore from '../../store/authStore'

function ReportsHub() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  const reports = [
    { label: 'Sales Report', desc: 'Revenue and transactions by date/branch', icon: TrendingUp, path: '/admin/reports/sales', color: 'bg-green-50 text-green-600' },
    { label: 'Stock Report', desc: 'Inventory value and low stock', icon: Package, path: '/admin/reports/stock', color: 'bg-blue-50 text-blue-600' },
    { label: 'Debt Report', desc: 'Customer credit outstanding', icon: Wallet, path: '/admin/reports/debt', color: 'bg-red-50 text-red-600' },
    { label: 'Customer Report', desc: 'Top spenders and top debtors', icon: Users, path: '/admin/reports/customers', color: 'bg-teal-50 text-teal-600' },
    { label: 'Expense Report', desc: 'Spending by category', icon: Receipt, path: '/admin/reports/expenses', color: 'bg-orange-50 text-orange-600' },
    { label: 'Profit & Loss', desc: 'Revenue minus cost and expenses', icon: PieChart, path: '/admin/reports/profit-loss', color: 'bg-purple-50 text-purple-600' },
  ]

  if (isSuperAdmin) {
    reports.push({ label: 'Supplier Debt Summary', desc: 'Total owed across all suppliers', icon: Truck, path: '/admin/reports/supplier-debt', color: 'bg-pink-50 text-pink-600' })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business insights and summaries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Link
            key={r.path}
            to={r.path}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${r.color}`}>
              <r.icon size={20} />
            </div>
            <p className="font-semibold text-gray-800">{r.label}</p>
            <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ReportsHub