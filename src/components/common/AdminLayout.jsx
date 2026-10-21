import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  GitBranch, Truck, BarChart2, Settings,
  ChevronLeft, Menu, X, LogOut,
  Wallet, Receipt, ArrowLeftRight, PackageCheck
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useBranchStore from '../../store/branchStore'
import toast from 'react-hot-toast'

const navItems = [
  {
    section: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', roles: ['super_admin', 'admin'] },
    ]
  },
  {
    section: 'Sales',
    items: [
      { label: 'POS / New Sale', icon: ShoppingCart, path: '/admin/pos', roles: ['super_admin', 'admin'] },
      { label: 'Sales History', icon: Receipt, path: '/admin/sales', roles: ['super_admin', 'admin'] },
      { label: 'Loose Cart', icon: ShoppingCart, path: '/admin/cart', roles: ['super_admin', 'admin'] },
    ]
  },
  {
    section: 'Inventory',
    items: [
      { label: 'Products', icon: Package, path: '/admin/products', roles: ['super_admin', 'admin'] },
      { label: 'Stock', icon: ArrowLeftRight, path: '/admin/stock', roles: ['super_admin', 'admin'] },
      { label: 'Suppliers', icon: Truck, path: '/admin/suppliers', roles: ['super_admin', 'admin'] },
    ]
  },
  {
    section: 'People',
    items: [
      { label: 'Customers', icon: Users, path: '/admin/customers', roles: ['super_admin', 'admin'] },
      { label: 'Staff', icon: Users, path: '/admin/staff', roles: ['super_admin'] },
      { label: 'Credit & Debt', icon: Wallet, path: '/admin/credit', roles: ['super_admin', 'admin'] },
      { label: 'Deposits', icon: Wallet, path: '/admin/deposits', roles: ['super_admin', 'admin'] },
      { label: 'Pending Collections', icon: PackageCheck, path: '/admin/collections', roles: ['super_admin', 'admin'] },
    ]
  },
  {
    section: 'Business',
    items: [
      { label: 'Branches', icon: GitBranch, path: '/admin/branches', roles: ['super_admin'] },
      { label: 'Expenses', icon: Wallet, path: '/admin/expenses', roles: ['super_admin', 'admin'] },
      { label: 'Reports', icon: BarChart2, path: '/admin/reports', roles: ['super_admin', 'admin'] },
      { label: 'Supplier Debt', icon: Wallet, path: '/admin/supplier-debt', roles: ['super_admin', 'admin'] },
      { label: 'Settings', icon: Settings, path: '/admin/settings', roles: ['super_admin'] },
    ]
  },
]

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout, defaultBranchId } = useAuthStore()
  const isMainBranchUser = useBranchStore((state) => state.isMainBranchUser)

  const visibleNavItems = navItems
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.roles.includes(user?.role)) return false
      if (item.requireMainBranch && !isMainBranchUser(user, defaultBranchId)) return false
      return true
    }),
  }))
  .filter((group) => group.items.length > 0)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">SA</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">Almubeen General Merchant</p>
              <p className="text-xs text-gray-400">POS System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {visibleNavItems.map((group) => (
            <div key={group.section} className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
                {group.section}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition mb-0.5 ${
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-green-700 text-sm font-bold">
                {user?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-NG', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>

      </div>
    </div>
  )
}

export default AdminLayout