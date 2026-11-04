import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { signup } from '../../services/authService'

const schema = z
  .object({
    business_name: z.string().min(2, 'Enter your business name'),
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email address'),
    phone: z.string().optional(),
    referral_code: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

const inputClass = (err) =>
  `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition ${
    err ? 'border-red-400 bg-red-50' : 'border-gray-200'
  }`

function Signup() {
  const [showPassword, setShowPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const initialRef = (searchParams.get('ref') || '').toUpperCase()
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { referral_code: initialRef } })

  const onSubmit = async (data) => {
    try {
      const { confirm, ...payload } = data
      const res = await signup(payload)
      if (res.success) {
        setSubmitted(true)
        toast.success('Account created')
        
      } else {
        toast.error(res.message || 'Signup failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create your account')
    }
  }

  const PasswordIcon = showPassword ? EyeOff : Eye

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600 text-white mb-4">
            <Store size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Request received</h1>
          <p className="text-gray-500 text-sm mt-2">
            Your account has been created and is waiting for activation. We will contact you once it is ready, then you can sign in.
          </p>
          <Link to="/login" className="inline-block mt-6 text-green-600 font-medium hover:underline">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600 text-white mb-4">
            <Store size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create your business account</h1>
          <p className="text-gray-500 text-sm mt-1">Your account will be activated after review.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Business name</label>
              <input {...register('business_name')} placeholder="e.g. Bright Pharmacy" className={inputClass(errors.business_name)} />
              {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Your full name</label>
              <input {...register('name')} className={inputClass(errors.name)} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email address</label>
              <input type="email" {...register('email')} placeholder="you@example.com" className={inputClass(errors.email)} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone (optional)</label>
              <input type="tel" {...register('phone')} className={inputClass(false)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Referral code (optional)</label>
              <input {...register('referral_code')} placeholder="e.g. K7M2QX" className={`${inputClass(false)} uppercase`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} {...register('password')} className={`${inputClass(errors.password)} pr-12`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <PasswordIcon size={18} />
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Confirm password</label>
              <input type={showPassword ? 'text' : 'password'} {...register('confirm')} className={inputClass(errors.confirm)} />
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create my account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            By creating an account you agree to our{' '}
            <Link to="/terms" className="underline">Terms</Link> and{' '}
            <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup