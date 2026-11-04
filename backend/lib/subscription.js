import supabase from './supabase.js'

export const GRACE_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000
const LAGOS_OFFSET_MS = 60 * 60 * 1000 // Lagos is UTC+1 all year

// The very end (23:59:59) of the Lagos calendar day that contains `date`
export function endOfLagosDay(date) {
  const lagos = new Date(new Date(date).getTime() + LAGOS_OFFSET_MS)
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate(), 22, 59, 59))
}

// "2026-12-31" typed on the platform page means the end of that day in Lagos
export function parsePaidUntil(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return new Date(`${value}T23:59:59+01:00`).toISOString()
  return new Date(value).toISOString()
}

// When a business will be deactivated: its paid-until date plus the grace period
export function deactivationDate(paidUntil) {
  return paidUntil ? new Date(new Date(paidUntil).getTime() + GRACE_DAYS * DAY_MS) : null
}

// Only active businesses WITH a paid-until date can expire. No date means no expiry.
export function isExpired(tenant, now = new Date()) {
  return tenant.status === 'active' && !!tenant.paid_until && now > deactivationDate(tenant.paid_until)
}

// Saves the deactivation. It only changes the business if it is still active with the same
// paid-until date, so a payment recorded a moment ago can never be undone by this.
export async function autoDeactivate(tenant) {
  try {
    const { data } = await supabase
      .from('tenants')
      .update({
        status: 'deactivated',
        status_note: 'Automatically deactivated: payment overdue',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenant.id)
      .eq('status', 'active')
      .eq('paid_until', tenant.paid_until)
      .select('id')

    if (data?.length) {
      await supabase.from('audit_logs').insert({
        tenant_id: tenant.id,
        action: 'auto_deactivated',
        entity_type: 'tenant',
        entity_id: tenant.id,
        new_value: { paid_until: tenant.paid_until },
      })
    }
  } catch (err) {
    console.error('Auto-deactivate error:', err.message)
  }
}