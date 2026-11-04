import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import { smsLink, whatsappLink, reminderMessage } from '../../lib/contact'

function ContactButtons({ customerId, name, phone, balance = 0, compact = false, onContacted }) {
  const business = useAuthStore((s) => s.tenant?.name)

  const open = (e, channel) => {
    e.preventDefault()
    e.stopPropagation()
    const message = reminderMessage({ name, business, balance })
    const link = channel === 'sms' ? smsLink(phone, message) : whatsappLink(phone, message)
    if (!link) {
      toast.error('This customer has no valid phone number')
      return
    }
    if (channel === 'sms') window.location.href = link
    else window.open(link, '_blank', 'noopener')

    // Note the date this customer was reminded about a debt
    if (customerId && Number(balance) > 0) {
      api.post(`/api/customers/${customerId}/reminders/log`).then(() => onContacted?.()).catch(() => {})
    }
  }

  const base = `inline-flex items-center rounded-lg font-medium transition ${
    compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  }`

  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" onClick={(e) => open(e, 'sms')} className={`${base} bg-blue-50 text-blue-600 hover:bg-blue-100`}>
        SMS
      </button>
      <button type="button" onClick={(e) => open(e, 'whatsapp')} className={`${base} bg-green-50 text-green-700 hover:bg-green-100`}>
        WhatsApp
      </button>
    </span>
  )
}

export default ContactButtons