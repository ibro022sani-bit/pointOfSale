import axios from 'axios'

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return '234' + digits.slice(1)
  return digits
}

export async function sendSMS(phone, message) {
  try {
    const response = await axios.post(`${process.env.TERMII_BASE_URL}api/sms/send`, {
      to: normalizePhone(phone),
      from: 'Sadeeq',
      sms: message,
      type: 'plain',
      channel: 'dnd',
      api_key: process.env.TERMII_API_KEY
    })
    console.log('Termii response:', response.data)
    return true
  } catch (err) {
    console.error('Termii SMS error:', err.response?.data || err.message)
    return false
  }
}

// WhatsApp reminders are pending an approved message template on Termii's dashboard.
// Once approved, this function should call Termii's /api/send/template endpoint
// with the template_id and variables — not the free-form /api/sms/send endpoint,
// since WhatsApp only allows free-form messages as replies within a customer-initiated window.
export async function sendWhatsApp(phone, message) {
  console.warn('sendWhatsApp called but not yet implemented — awaiting approved Termii template')
  return false
}