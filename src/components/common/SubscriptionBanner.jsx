import { useEffect, useState } from 'react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import { APP_NAME, WHATSAPP_NUMBER, CONTACT_PHONE } from '../../config/brand'

const DAY = 24 * 60 * 60 * 1000
const fmt = (ms) => new Date(ms).toLocaleDateString('en-NG', { dateStyle: 'long' })

// Warns everyone in a business when the subscription is about to end or has ended.
// Shows nothing for businesses without a paid-until date.
function SubscriptionBanner() {
  const { user, tenant } = useAuthStore()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    api.get('/api/settings/business').then((res) => setInfo(res.data.data)).catch(() => {})
  }, [])

  if (!info?.paid_until || !info?.deactivates_at) return null

  const now = Date.now()
  const paidUntil = new Date(info.paid_until).getTime()
  const deactivatesAt = new Date(info.deactivates_at).getTime()
  const isOwner = user?.role === 'super_admin'
  const who = isOwner ? 'Your' : 'Your business’s'

  let tone
  let text
  if (now > paidUntil) {
    const daysLeft = Math.max(1, Math.ceil((deactivatesAt - now) / DAY))
    tone = 'red'
    text = `${who} subscription ended on ${fmt(paidUntil)}. The account will be suspended in ${daysLeft} day${daysLeft === 1 ? '' : 's'} unless payment is received.${isOwner ? '' : ' Please let the owner know.'}`
  } else {
    const daysToEnd = Math.ceil((paidUntil - now) / DAY)
    if (daysToEnd > 7) return null
    tone = 'amber'
    text = daysToEnd <= 1
      ? `${who} subscription ends today (${fmt(paidUntil)}).`
      : `${who} subscription ends on ${fmt(paidUntil)} (${daysToEnd} days left).`
  }

  const message = `Hello, I would like to renew the ${APP_NAME} subscription for ${tenant?.name || 'my business'}.`
  const renewHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    : CONTACT_PHONE
      ? `tel:${CONTACT_PHONE.replace(/\s/g, '')}`
      : null

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2 ${
        tone === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      <span>{text}</span>
      {isOwner && renewHref && (
        <a href={renewHref} target="_blank" rel="noreferrer" className="font-semibold underline">
          Renew now
        </a>
      )}
    </div>
  )
}

export default SubscriptionBanner