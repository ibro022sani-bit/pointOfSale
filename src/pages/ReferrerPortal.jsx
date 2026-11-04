import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { APP_NAME } from '../config/brand'

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '')
const rewardText = (type, value) => {
  if (!(Number(value) > 0)) return null
  return type === 'months'
    ? `${Number(value)} free month${Number(value) === 1 ? '' : 's'}`
    : naira(value)
}

const STATUS = {
  waiting: ['Waiting for their first payment', 'bg-gray-100 text-gray-600'],
  pending: ['Reward on the way', 'bg-amber-100 text-amber-700'],
  paid: ['Rewarded', 'bg-green-100 text-green-700'],
  cancelled: ['Not rewarded', 'bg-red-100 text-red-700'],
}

function ReferrerPortal() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | ok | missing | error

  useEffect(() => {
    api
      .get(`/api/referrer-portal/${token}`)
      .then((res) => {
        setData(res.data.data)
        setState('ok')
      })
      .catch((err) => setState(err.response?.status === 404 ? 'missing' : 'error'))
  }, [token])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (state !== 'ok') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 text-center">
        <p className="text-gray-500">
          {state === 'missing' ? 'This link is not valid. Please ask for a new one.' : 'Something went wrong. Please try again.'}
        </p>
      </div>
    )
  }

  const { referrer, stats, referrals } = data
  const link = `${window.location.origin}/signup?ref=${referrer.code}`
  const shareText = `Run your shop, stock and staff from one app. Sign up for ${APP_NAME} with my referral code ${referrer.code}: ${link}`
  const reward = rewardText(referrer.reward_type, referrer.reward_value)

  const copy = () => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <span className="font-bold text-green-700">{APP_NAME}</span>
          <span className="text-sm text-gray-400"> · Referral partner</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Hello, {referrer.name}</h1>
          {!referrer.is_active && <p className="mt-1 text-sm text-red-600">Your referral link is currently inactive.</p>}
          <p className="mt-1 text-sm text-gray-500">
            {reward
              ? `You earn ${reward} for every business you refer that signs up and makes its first payment.`
              : 'Ask us about your reward for each business you refer.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm font-medium text-gray-600">Your referral link</p>
          <p className="mt-2 text-sm text-gray-800 break-all bg-gray-50 rounded-lg px-3 py-2">{link}</p>
          <p className="mt-2 text-xs text-gray-400">Your code: <span className="font-mono font-semibold">{referrer.code}</span></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={share} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              Share on WhatsApp
            </button>
            <button onClick={copy} className="border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:border-gray-300">
              Copy link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Referred', stats.total],
            ['Waiting', stats.waiting],
            ['Owed to you', naira(stats.owed_money)],
            ['Paid to you', stats.paid_months > 0 ? `${naira(stats.paid_money)} + ${stats.paid_months} mo` : naira(stats.paid_money)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-lg font-bold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border">
          <h2 className="px-5 pt-5 font-semibold text-gray-800">Your referrals</h2>
          {referrals.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">No referrals yet. Share your link to get started.</p>
          ) : (
            <ul className="divide-y divide-gray-100 mt-3">
              {referrals.map((r, i) => (
                <li key={i} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.business_name}</p>
                    <p className="text-xs text-gray-400">
                      Signed up {fmt(r.signed_up_at)}
                      {r.paid_at ? ` · Rewarded ${fmt(r.paid_at)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS[r.reward_status]?.[1] || ''}`}>
                      {STATUS[r.reward_status]?.[0] || r.reward_status}
                    </span>
                    {rewardText(r.reward_type, r.reward_value) && r.reward_status !== 'cancelled' && (
                      <p className="text-xs text-gray-500 mt-1">{rewardText(r.reward_type, r.reward_value)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default ReferrerPortal