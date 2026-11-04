import supabase from './supabase.js'

const PAGE_SIZE = 1000 // Supabase returns at most 1000 rows per request
const PARALLEL_PAGES = 4 // pages fetched at the same time
const MAX_ROWS = 20000 // safety cap per query, so one request can never run away

// Calling any of these means "I want a specific amount of rows", so no automatic paging
const NO_PAGING = new Set(['single', 'maybeSingle', 'limit', 'range', 'csv'])

// A tenant-scoped wrapper around the Supabase client.
// Reads/updates/deletes are filtered by tenant_id; inserts/upserts get tenant_id stamped on.
export function makeTenantDb(client, tenantId) {
  const stamp = (rows) =>
    Array.isArray(rows)
      ? rows.map((r) => ({ ...r, tenant_id: tenantId }))
      : { ...rows, tenant_id: tenantId }

  // select() records the chain a route builds (.eq, .order, ...) and replays it on a fresh query
  // for every page, so lists and reports get ALL their rows instead of stopping at 1000.
  function select(table, args) {
    const calls = []
    let paged = !(args[1] && args[1].head)

    const build = () => {
      let q = client.from(table).select(...args).eq('tenant_id', tenantId)
      for (const [name, callArgs] of calls) q = q[name](...callArgs)
      return q
    }

    const fetchPage = (index) => {
      const from = index * PAGE_SIZE
      // "id" as a final sort key keeps the pages consistent with each other
      return build().order('id', { ascending: true }).range(from, from + PAGE_SIZE - 1)
    }

    const execute = async () => {
      if (!paged) return build()

      const rows = []
      let count = null
      const maxPages = Math.ceil(MAX_ROWS / PAGE_SIZE)
      const finish = () => ({ data: rows, error: null, count, status: 200, statusText: 'OK' })

      let next = 0
      while (next < maxPages) {
        // The first request goes alone, so small lists cost one request. Only when it comes back
        // full do we fetch the following pages, several at a time.
        const batch = next === 0 ? 1 : Math.min(PARALLEL_PAGES, maxPages - next)
        const results = await Promise.all(Array.from({ length: batch }, (_, i) => fetchPage(next + i)))

        for (const res of results) {
          if (res.error) return res
          if (count === null && res.count != null) count = res.count
          const data = res.data || []
          rows.push(...data)
          if (data.length < PAGE_SIZE) return finish()
        }
        next += batch
      }

      console.warn(`tenantDb: row cap (${MAX_ROWS}) reached on "${table}"; the results were cut off`)
      return finish()
    }

    const chain = new Proxy({}, {
      get(_, prop) {
        if (prop === 'then') return (resolve, reject) => execute().then(resolve, reject)
        if (prop === 'catch') return (reject) => execute().catch(reject)
        if (prop === 'finally') return (fn) => execute().finally(fn)
        if (typeof prop === 'symbol') return undefined
        return (...callArgs) => {
          if (NO_PAGING.has(prop)) paged = false
          calls.push([prop, callArgs])
          return chain
        }
      },
    })
    return chain
  }

  return {
    tenantId,
    from(table) {
      return {
        select: (...args) => select(table, args),
        insert: (rows, opts) => client.from(table).insert(stamp(rows), opts),
        upsert: (rows, opts) => client.from(table).upsert(stamp(rows), opts),
        update: (values, opts) => {
          const { tenant_id, ...safe } = values // never let a request change the tenant
          return client.from(table).update(safe, opts).eq('tenant_id', tenantId)
        },
        delete: (opts) => client.from(table).delete(opts).eq('tenant_id', tenantId),
      }
    },
  }
}

export function tenantDb(tenantId) {
  return makeTenantDb(supabase, tenantId)
}