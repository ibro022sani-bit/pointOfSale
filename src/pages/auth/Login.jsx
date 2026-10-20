import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { staffLogin } from '../../services/authService'
import Logo from '../../components/common/Logo'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
  try {
    const response = await staffLogin(data.email, data.password)

    if (response.success) {
      login(response.data.user, response.data.token)
      toast.success('Login successful!')

      if (response.data.user.role === 'super_admin' || response.data.user.role === 'admin') {
        navigate('/admin/dashboard')
      } else if (response.data.user.role === 'cashier') {
        navigate('/cashier/dashboard')
      }
    } else {
      toast.error(response.message || 'Login failed')
    }
  } catch (err) {
    toast.error('Invalid email or password')
  }
}

  const PasswordIcon = showPassword ? EyeOff : Eye

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <Logo size={64} showText={false} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SADEEQ AGROVET</h1>
          <p className="text-gray-500 text-sm mt-1">AND GENERAL MERCHANT</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition pr-12 ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <PasswordIcon size={18} />
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )
              }
            </button>

          </form>
        </div>

        {/* Customer Portal Link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Are you a customer?{' '}
          <a href="/customer/login" className="text-green-600 font-medium hover:underline">
            Login here
          </a>
        </p>

      </div>
    </div>
  )
}

export default Login