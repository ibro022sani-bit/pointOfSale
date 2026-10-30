import supabase from './supabase.js'

// A tenant-scoped wrapper around the Supabase client.
// Reads/updates/deletes are filtered by tenant_id; inserts/upserts get tenant_id stamped on.
export function tenantDb(tenantId) {
  const stamp = (rows) =>
    Array.isArray(rows)
      ? rows.map((r) => ({ ...r, tenant_id: tenantId }))
      : { ...rows, tenant_id: tenantId }

  return {
    tenantId,
    from(table) {
      const t = supabase.from(table)
      return {
        select: (...args) => t.select(...args).eq('tenant_id', tenantId),
        insert: (rows, opts) => t.insert(stamp(rows), opts),
        upsert: (rows, opts) => t.upsert(stamp(rows), opts),
        update: (values, opts) => {
          const { tenant_id, ...safe } = values // never let a request change the tenant
          return t.update(safe, opts).eq('tenant_id', tenantId)
        },
        delete: (opts) => t.delete(opts).eq('tenant_id', tenantId),
      }
    },
  }
}