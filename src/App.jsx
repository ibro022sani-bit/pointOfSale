import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import AdminLayout from './components/common/AdminLayout'
import CashierLayout from './components/common/CashierLayout'
import Dashboard from './pages/admin/Dashboard'
import POS from './pages/admin/POS'
import Products from './pages/admin/Products'
import ProductDetail from './pages/admin/ProductDetail'
import Branches from './pages/admin/Branches'
import Suppliers from './pages/admin/Suppliers'
import Staff from './pages/admin/Staff'
import useAuthStore from './store/authStore'
import CustomerLogin from './pages/customer/Login'
import CustomerRegister from './pages/customer/Register'
import CustomerLayout from './pages/customer/CustomerLayout'
import useBranchStore from './store/branchStore'
import Stock from './pages/admin/Stock'
import SalesHistory from './pages/admin/SalesHistory'
import Customers from './pages/admin/Customers'
import LooseCart from './pages/cashier/LooseCart'
import CashierDashboard from './pages/cashier/CashierDashboard'
import CreditDebt from './pages/admin/CreditDebt'
import Deposits from './pages/admin/Deposits'
import Collections from './pages/admin/Collections'
import CustomerDetail from './pages/admin/CustomerDetail'
import SupplierDebt from './pages/admin/SupplierDebt'
import Expenses from './pages/admin/Expenses'
import ReportsHub from './pages/admin/ReportsHub'
import SalesReport from './pages/admin/reports/SalesReport'
import StockReport from './pages/admin/reports/StockReport'
import DebtReport from './pages/admin/reports/DebtReport'
import ExpenseReport from './pages/admin/reports/ExpenseReport'
import ProfitLossReport from './pages/admin/reports/ProfitLossReport'
import SupplierDebtSummary from './pages/admin/reports/SupplierDebtSummary'
import CustomerReport from './pages/admin/reports/CustomerReport'
import Balance from './pages/customer/Balance'
import ProfileEdit from './pages/customer/ProfileEdit'

function ComingSoon({ title }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-300 mb-2">{title}</p>
        <p className="text-gray-400 text-sm">Coming soon</p>
      </div>
    </div>
  )
}

function AdminPage({ children, title }) {
  return (
    <AdminLayout>
      {children || <ComingSoon title={title} />}
    </AdminLayout>
  )
}

function CashierPage({ children, title }) {
  return (
    <CashierLayout>
      {children || <ComingSoon title={title} />}
    </CashierLayout>
  )
}

function CustomerPortalPage({ children, title }) {
  return (
    <CustomerLayout>
      {children || <ComingSoon title={title} />}
    </CustomerLayout>
  )
}

// Guards a route by role. `allowed` is an array of roles permitted here.
// Not logged in -> /login. Logged in but wrong role -> their own dashboard.
function dashboardPathFor(user) {
  return user?.role === 'cashier'
    ? '/cashier/dashboard'
    : user?.role === 'customer'
      ? '/customer/balance'
      : '/admin/dashboard'
}

function ProtectedRoute({ allowed, requireMainBranch, children }) {
  const { user, isAuthenticated, defaultBranchId } = useAuthStore()
  const location = useLocation()
  const isMainBranchUser = useBranchStore((state) => state.isMainBranchUser)
  const branchesLoaded = useBranchStore((state) => state.loaded)

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/customer') ? '/customer/login' : '/login'
    return <Navigate to={loginPath} replace />
  }

  const fallback = dashboardPathFor(user)

  if (!allowed.includes(user?.role)) {
    return <Navigate to={fallback} replace />
  }

  if (requireMainBranch) {
    if (!branchesLoaded) {
      return (
        <div className="h-screen flex items-center justify-center">
          <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
    if (!isMainBranchUser(user, defaultBranchId)) {
      return <Navigate to={fallback} replace />
    }
  }

  return children
}

function RootRoute() {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    return <Navigate to={dashboardPathFor(user)} replace />
  }
  return <Landing />
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    return <Navigate to={dashboardPathFor(user)} replace />
  }
  return children
}

function App() {
  // Read isAuthenticated and user together from ONE subscription, not two
  // separate selector hooks. Two independent useAuthStore(selector) calls
  // can momentarily render out of sync with each other even when the
  // underlying set() was atomic — that gap was letting fetchBranches()
  // fire with isAuthenticated already true but userRole not yet resolved.
  const { loadFromStorage, isAuthenticated, user } = useAuthStore()
  const userRole = user?.role
  const fetchBranches = useBranchStore((state) => state.fetchBranches)

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    // Branches are a staff/business concept — customers have no branch_id
    // and /api/branches rejects their token, which was silently logging
    // every customer back out immediately after they signed in.
    if (isAuthenticated && userRole !== 'customer') {
      fetchBranches()
    }
  }, [isAuthenticated, userRole])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/customer/login" element={<PublicOnlyRoute><CustomerLogin /></PublicOnlyRoute>} />
        <Route path="/customer/register" element={<PublicOnlyRoute><CustomerRegister /></PublicOnlyRoute>} />

        <Route path="/customer/dashboard" element={<Navigate to="/customer/balance" replace />} />
                <Route path="/customer/balance" element={
          <ProtectedRoute allowed={['customer']}><CustomerPortalPage><Balance /></CustomerPortalPage></ProtectedRoute>
        } />
        <Route path="/customer/profile" element={
          <ProtectedRoute allowed={['customer']}><CustomerPortalPage><ProfileEdit /></CustomerPortalPage></ProtectedRoute>
        } />

        {/* Admin + Super Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Dashboard /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/pos" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><POS /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/products" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Products /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/products/:id" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><ProductDetail /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/branches" element={
          <ProtectedRoute allowed={['super_admin']}><AdminPage><Branches /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/suppliers" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Suppliers /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/staff" element={
          <ProtectedRoute allowed={['super_admin']}><AdminPage><Staff /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/credit" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><CreditDebt /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/collections" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Collections /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/deposits" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Deposits /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/expenses" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Expenses /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><ReportsHub /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports/sales" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><SalesReport /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports/stock" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><StockReport /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports/debt" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><DebtReport /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports/expenses" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><ExpenseReport /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports/profit-loss" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><ProfitLossReport /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports/supplier-debt" element={
          <ProtectedRoute allowed={['super_admin']}><AdminPage><SupplierDebtSummary /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/reports/customers" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><CustomerReport /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute allowed={['super_admin']}><AdminPage title="Settings" /></ProtectedRoute>
        } />
        <Route path="/admin/stock" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Stock /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/sales" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><SalesHistory /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/customers" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><Customers /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/customers/:id" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><CustomerDetail /></AdminPage></ProtectedRoute>
        } />
        <Route path="/admin/cart" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><LooseCart /></AdminPage></ProtectedRoute>
        } />

        {/* Cashier Routes */}
        <Route path="/cashier/dashboard" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><CashierDashboard /></CashierPage></ProtectedRoute>
        } />
        <Route path="/cashier/pos" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><POS /></CashierPage></ProtectedRoute>
        } />
        <Route path="/cashier/cart" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><LooseCart /></CashierPage></ProtectedRoute>
        } />
        <Route path="/cashier/sales" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><SalesHistory /></CashierPage></ProtectedRoute>
        } />
        <Route path="/cashier/customers" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><Customers /></CashierPage></ProtectedRoute>
        } />
        <Route path="/cashier/credit" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><CreditDebt /></CashierPage></ProtectedRoute>
        } />
        <Route path="/cashier/deposits" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><Deposits /></CashierPage></ProtectedRoute>
        } />
        <Route path="/cashier/collections" element={
          <ProtectedRoute allowed={['cashier']}><CashierPage><Collections /></CashierPage></ProtectedRoute>
        } />
        <Route path="/admin/supplier-debt" element={
          <ProtectedRoute allowed={['super_admin', 'admin']}><AdminPage><SupplierDebt /></AdminPage></ProtectedRoute>
        } />
      </Routes> 
    </BrowserRouter>
  )
}

export default App