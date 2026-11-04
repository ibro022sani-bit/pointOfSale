// Turns a phone number as typed (0803 123 4567, +234 803..., 8031234567) into
// international digits without the plus, e.g. 2348031234567. Returns null if it looks invalid.
export function toInternational(phone) {
  const raw = String(phone || '').trim()
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (raw.startsWith('+')) return digits.length >= 10 && digits.length <= 15 ? digits : null
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('234') && digits.length >= 13) digits = digits
  else if (digits.startsWith('0') && digits.length === 11) digits = '234' + digits.slice(1)
  else if (digits.length === 10) digits = '234' + digits
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)

export function smsLink(phone, message) {
  const intl = toInternational(phone)
  if (!intl) return null
  // Android and iPhone use different separators before the message text
  return `sms:+${intl}${isIOS() ? '&' : '?'}body=${encodeURIComponent(message)}`
}

export function whatsappLink(phone, message) {
  const intl = toInternational(phone)
  if (!intl) return null
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
}

export function reminderMessage({ name, business, balance }) {
  if (Number(balance) > 0) {
    const from = business ? `from ${business} ` : ''
    return `Hello ${name}, this is a reminder ${from}that you have an outstanding balance of ₦${Number(balance).toLocaleString()}. Kindly settle at your earliest convenience. Thank you.`
  }
  return `Hello ${name}, this is ${business || 'us'}.`
}