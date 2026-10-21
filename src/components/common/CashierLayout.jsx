import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Receipt, Users, Wallet, LogOut, Menu, X
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/cashier/dashboard' },
  { label: 'POS / New Sale', icon: ShoppingCart, path: '/cashier/pos' },
  { label: 'Loose Cart', icon: ShoppingCart, path: '/cashier/cart' },
  { label: "Today's Sales", icon: Receipt, path: '/cashier/sales' },
  { label: 'Customers', icon: Users, path: '/cashier/customers' },
  { label: 'Credit & Debt', icon: Wallet, path: '/cashier/credit' },
  { label: 'Deposits', icon: Wallet, path: '/cashier/deposits' },
]

function CashierLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">SA</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">Almubeen General Merchant</p>
              <p className="text-xs text-gray-400">Cashier Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition mb-0.5 ${
                  isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-green-700 text-sm font-bold">{user?.name?.charAt(0) || 'C'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">Cashier</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition w-full px-3 py-2 rounded-xl hover:bg-red-50"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default CashierLayout