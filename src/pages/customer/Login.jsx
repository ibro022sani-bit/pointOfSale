import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import Logo from '../../components/common/Logo'

function CustomerLogin() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  // Help / branches state
  const [showHelp, setShowHelp] = useState(false)
  const [branches, setBranches] = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [branchesError, setBranchesError] = useState('')

  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!phone || !password) {
      toast.error('Enter your phone number and password')
      return
    }

    setSaving(true)

    try {
      const res = await api.post('/api/auth/customer/login', {
        phone,
        password,
      })

      const { token, user } = res.data.data

      login(user, token)

      toast.success(`Welcome back, ${user.name}!`)
      navigate('/customer/balance')
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Login failed — check your phone number and password'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleHelpClick = async () => {
    setShowHelp(true)
    setBranchesError('')

    // Don't fetch again if branches have already been loaded
    if (branches.length > 0) return

    setLoadingBranches(true)

    try {
      const res = await api.get('/api/public/branches')

      setBranches(res.data.data || [])
    } catch (err) {
      setBranchesError(
        err.response?.data?.message ||
          'Unable to load branch information. Please try again.'
      )
    } finally {
      setLoadingBranches(false)
    }
  }

  const closeHelp = () => {
    setShowHelp(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-6">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo size={48} showText={false} />
          </div>

          <h1 className="text-lg font-bold text-gray-800">
            ALMUBEEN GENERAL MERCHANT
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Customer Login
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Phone Number
            </label>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
          >
            {saving ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Help Button */}
        <button
          type="button"
          onClick={handleHelpClick}
          className="w-full mt-4 py-2.5 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl text-sm font-medium transition"
        >
          Need Help? Contact a Branch
        </button>

        {/* Register */}
        <p className="text-center text-sm text-gray-500 mt-4">
          New customer?{' '}
          <Link
            to="/customer/register"
            className="text-green-600 font-medium hover:text-green-700"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Help / Branches Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onClick={closeHelp}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Contact Our Branches
                </h2>

                <p className="text-sm text-gray-500 mt-0.5">
                  Get in touch with a branch near you
                </p>
              </div>

              <button
                type="button"
                onClick={closeHelp}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-lg"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto max-h-[65vh]">
              {loadingBranches && (
                <div className="py-10 text-center">
                  <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />

                  <p className="text-sm text-gray-500">
                    Loading branches...
                  </p>
                </div>
              )}

              {!loadingBranches && branchesError && (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                    !
                  </div>

                  <p className="text-sm text-gray-600">
                    {branchesError}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setBranches([])
                      handleHelpClick()
                    }}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loadingBranches &&
                !branchesError &&
                branches.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">
                      No branches are currently available.
                    </p>
                  </div>
                )}

              {!loadingBranches &&
                !branchesError &&
                branches.length > 0 && (
                  <div className="space-y-3">
                    {branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="border border-gray-100 rounded-xl p-4 bg-gray-50"
                      >
                        <h3 className="font-semibold text-gray-800">
                          {branch.name}
                        </h3>

                        <a
                          href={`tel:${branch.phone}`}
                          className="flex items-center gap-2 mt-3 text-sm text-green-600 font-medium hover:text-green-700"
                        >
                          <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                            ☎
                          </span>

                          <span>{branch.phone}</span>
                        </a>

                        {branch.address && (
                          <div className="flex items-start gap-2 mt-3 text-sm text-gray-500">
                            <span className="w-8 h-8 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                              📍
                            </span>

                            <span className="pt-1">
                              {branch.address}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={closeHelp}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerLogin