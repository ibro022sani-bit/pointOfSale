// Restore tool for Kasuwana backups. Runs on YOUR computer, never on the website.
//
//   node tools/restore.mjs <backup.zip> --mode=check|add|replace|rebuild|archive
//
// It talks to the database named by these two settings (typed in the terminal each time):
//   RESTORE_SUPABASE_URL           e.g. https://abcd1234.supabase.co
//   RESTORE_SUPABASE_SERVICE_KEY   that project's service_role key
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

// Parents first. Deleting happens in the reverse order.
export const ORDER = [
  'tenants', 'branches', 'users', 'product_categories', 'product_units', 'products',
  'branch_products', 'stock', 'suppliers', 'stock_receipts', 'stock_receipt_items',
  'stock_receipt_payments', 'stock_transfers', 'stock_transfer_items', 'customers',
  'credit_accounts', 'deposit_accounts', 'sales', 'payments', 'credit_transactions',
  'deposit_transactions', 'sale_items', 'expenses', 'debt_reminders', 'notifications',
  'tenant_payments', 'audit_logs', 'referrers', 'referrals',
]

// Records that belong to the platform side. "replace" only ever ADDS missing ones; it never
// changes or deletes them, so a restore can't undo a payment you recorded or a status you set.
const ADD_ONLY = new Set(['tenants', 'tenant_payments', 'audit_logs', 'referrers', 'referrals'])

const SCOPE_COLUMN = { tenants: 'id', referrals: 'referred_tenant_id' }
const scopeColumn = (table) => SCOPE_COLUMN[table] || 'tenant_id'

const PAGE = 1000
const BATCH = 500

// Archiving a business deletes its working data. These stay: the business row itself (so you know
// who they were), what they paid you, and referral records.
const ARCHIVE_KEEPS = new Set(['tenants', 'tenant_payments', 'referrers', 'referrals'])
export const RETENTION_DAYS = 100 // a business must have been deactivated this long before it can be archived
export const KEEP_MONTHS = 12 // how long you keep the archive file before deleting it

export async function readBackup(zipBytes) {
  const { unzipSync, strFromU8 } = await import('fflate')
  const files = unzipSync(zipBytes)
  const tables = {}
  for (const [path, data] of Object.entries(files)) {
    const m = path.match(/^json\/(.+)\.json$/)
    if (m) tables[m[1]] = JSON.parse(strFromU8(data))
  }
  const summaryFile = files['summary.txt']
  const summary = summaryFile ? strFromU8(summaryFile) : ''
  return {
    tables,
    isFull: 'referrers' in tables, // only a full backup contains the referrers table
    hasProblems: summary.includes('PROBLEMS FOUND'),
  }
}

// Same data regardless of the order the keys came in
const stable = (row) => JSON.stringify(Object.fromEntries(Object.keys(row).sort().map((k) => [k, row[k]])))

async function fetchAll(client, table, scope) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    let q = client.from(table).select('*')
    if (scope) q = q.eq(scope.col, scope.id)
    const { data, error } = await q.order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw new Error(`Could not read ${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

// Compares the backup with what is in the database right now. Changes nothing.
export async function buildPlan(client, backup, mode) {
  const tenantId = backup.isFull ? null : backup.tables.tenants?.[0]?.id || null
  const plan = []
  for (const table of ORDER) {
    const backupRows = backup.tables[table]
    if (!backupRows) continue
    const scope = tenantId ? { col: scopeColumn(table), id: tenantId } : null
    const current = await fetchAll(client, table, scope)
    const byId = new Map(current.map((r) => [r.id, r]))
    const backupIds = new Set(backupRows.map((r) => r.id))
    plan.push({
      table,
      inBackup: backupRows.length,
      inDatabase: current.length,
      missing: backupRows.filter((r) => !byId.has(r.id)),
      changed: backupRows.filter((r) => byId.has(r.id) && stable(r) !== stable(byId.get(r.id))),
      extra: current.filter((r) => !backupIds.has(r.id)),
      addOnly: ADD_ONLY.has(table),
    })
  }
  return { tenantId, plan, mode }
}

// What each mode will actually do to each table
export function actionsFor({ plan, mode }) {
  return plan.map((p) => {
    let insert = []
    let overwrite = []
    let remove = []
    if (mode === 'add' || mode === 'rebuild') insert = p.missing
    if (mode === 'replace') {
      insert = p.missing
      if (!p.addOnly) {
        overwrite = p.changed
        remove = p.extra
      }
    }
    return { table: p.table, insert, overwrite, remove }
  })
}

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

export async function applyActions(client, actions, log = () => {}) {
  // 1. Adding and overwriting, parents first
  for (const a of actions) {
    for (const batch of chunks(a.insert, BATCH)) {
      const { error } = await client.from(a.table).upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
      if (error) throw new Error(`${a.table}: ${error.message}`)
    }
    for (const batch of chunks(a.overwrite, BATCH)) {
      const { error } = await client.from(a.table).upsert(batch, { onConflict: 'id' })
      if (error) throw new Error(`${a.table}: ${error.message}`)
    }
    if (a.insert.length || a.overwrite.length) log(`${a.table}: added ${a.insert.length}, restored ${a.overwrite.length}`)
  }
  // 2. Removing rows that are not in the backup, children first
  for (const a of [...actions].reverse()) {
    for (const batch of chunks(a.remove, 100)) {
      const { error } = await client.from(a.table).delete().in('id', batch.map((r) => r.id))
      if (error) throw new Error(`${a.table}: ${error.message}`)
    }
    if (a.remove.length) log(`${a.table}: removed ${a.remove.length}`)
  }
}

export function printPlan({ plan, mode }, print = console.log) {
  // Check mode does nothing, so it shows the raw differences instead of what a restore would do
  if (mode === 'check') {
    print(`\n${'table'.padEnd(26)}${'backup'.padStart(8)}${'now'.padStart(8)}${'missing'.padStart(9)}${'different'.padStart(11)}${'extra'.padStart(8)}`)
    for (const p of plan) {
      print(`${p.table.padEnd(26)}${String(p.inBackup).padStart(8)}${String(p.inDatabase).padStart(8)}${String(p.missing.length).padStart(9)}${String(p.changed.length).padStart(11)}${String(p.extra.length).padStart(8)}`)
    }
    const total = (k) => plan.reduce((n, p) => n + p[k].length, 0)
    print(`\nmissing = in the backup but not in the database, different = same record but changed, extra = in the database but not in the backup`)
    print(`Total: missing ${total('missing')}, different ${total('changed')}, extra ${total('extra')}`)
    return { add: 0, restore: 0, remove: 0, differences: total('missing') + total('changed') + total('extra') }
  }

  const actions = actionsFor({ plan, mode })
  print(`\n${'table'.padEnd(26)}${'backup'.padStart(8)}${'now'.padStart(8)}${'to add'.padStart(9)}${'to restore'.padStart(12)}${'to remove'.padStart(11)}`)
  for (const [i, p] of plan.entries()) {
    const a = actions[i]
    print(`${p.table.padEnd(26)}${String(p.inBackup).padStart(8)}${String(p.inDatabase).padStart(8)}${String(a.insert.length).padStart(9)}${String(a.overwrite.length).padStart(12)}${String(a.remove.length).padStart(11)}`)
  }
  const sum = (k) => actions.reduce((n, a) => n + a[k].length, 0)
  print(`\nTotal: add ${sum('insert')}, restore ${sum('overwrite')}, remove ${sum('remove')}`)
  return { add: sum('insert'), restore: sum('overwrite'), remove: sum('remove'), differences: 0 }
}

// Staff emails must be unique across the whole system. If the person has signed up again with the
// same email since the backup was made, restoring their old account would collide with it.
export async function findEmailConflicts(client, planned) {
  const users = planned.plan.find((p) => p.table === 'users')
  const incoming = (users?.missing || []).filter((u) => u.email)
  const conflicts = []
  for (const batch of chunks(incoming, 50)) {
    const { data, error } = await client.from('users').select('id, email').in('email', batch.map((u) => u.email))
    if (error) throw new Error(`Could not check staff emails: ${error.message}`)
    for (const row of data) {
      const mine = batch.find((u) => u.email === row.email)
      if (mine && mine.id !== row.id) conflicts.push(row.email)
    }
  }
  return conflicts
}

// ---------- ARCHIVE ----------
// Works out what archiving would delete, and refuses unless it is safe.
export async function prepareArchive(client, backup, { minDays = RETENTION_DAYS, now = new Date() } = {}) {
  const wanted = backup.tables.tenants?.[0]
  if (backup.isFull || !wanted) throw new Error('Pick one business with --business="Name".')

  const { data: tenant, error } = await client.from('tenants').select('*').eq('id', wanted.id).maybeSingle()
  if (error) throw new Error(`Could not read the business: ${error.message}`)
  if (!tenant) throw new Error('That business is not in this database.')
  if (tenant.status === 'archived') throw new Error('This business is already archived.')
  if (tenant.status !== 'deactivated') {
    throw new Error(`Only a deactivated business can be archived. This one is "${tenant.status}".`)
  }
  if (!tenant.deactivated_at) throw new Error('This business has no deactivation date on record, so the waiting period cannot be checked.')
  const days = Math.floor((now.getTime() - new Date(tenant.deactivated_at).getTime()) / 86400000)
  if (days < minDays) throw new Error(`This business was deactivated ${days} days ago. The minimum is ${minDays} days.`)

  const planned = await buildPlan(client, backup, 'check')
  const blockers = []
  const deletes = []
  for (const p of planned.plan) {
    if (ARCHIVE_KEEPS.has(p.table)) continue
    // Anything in the database that is not identical in the backup would be lost for good
    if (p.changed.length || p.extra.length) {
      blockers.push(`${p.table}: ${p.changed.length} changed since the backup, ${p.extra.length} not in the backup`)
    }
    // Rows already gone (an earlier archive that stopped halfway) are fine
    const gone = new Set(p.missing.map((r) => r.id))
    deletes.push({ table: p.table, ids: backup.tables[p.table].filter((r) => !gone.has(r.id)).map((r) => r.id) })
  }
  const kept = planned.plan.filter((p) => ARCHIVE_KEEPS.has(p.table)).map((p) => ({ table: p.table, rows: p.inDatabase }))
  return { tenant, days, deletes, kept, blockers }
}

export function printArchive(prep, print = console.log) {
  print(`\nBusiness: ${prep.tenant.name}  (deactivated ${prep.days} days ago)`)
  print(`\n${'table'.padEnd(26)}${'rows to delete'.padStart(16)}`)
  for (const d of prep.deletes) print(`${d.table.padEnd(26)}${String(d.ids.length).padStart(16)}`)
  const total = prep.deletes.reduce((n, d) => n + d.ids.length, 0)
  print(`\nTotal rows to delete: ${total}`)
  print(`Kept: the business record and its payment history (${prep.kept.find((k) => k.table === 'tenant_payments')?.rows ?? 0} payments).`)
  return total
}

export async function applyArchive(client, prep, { file, now = new Date(), keepMonths = KEEP_MONTHS } = {}, log = () => {}) {
  // Children first, so no row is deleted while another still points at it
  for (const d of [...prep.deletes].reverse()) {
    for (const batch of chunks(d.ids, 100)) {
      const { error } = await client.from(d.table).delete().in('id', batch)
      if (error) throw new Error(`${d.table}: ${error.message}`)
    }
    if (d.ids.length) log(`${d.table}: deleted ${d.ids.length}`)
  }
  const deleteBy = new Date(now)
  deleteBy.setMonth(deleteBy.getMonth() + keepMonths)
  const day = (d) => d.toISOString().slice(0, 10)
  const fileName = String(file).split(/[\\/]/).pop() // just the file name, from a Windows or any other path
  const { error } = await client.from('tenants').update({
    status: 'archived',
    archived_at: now.toISOString(),
    archive_delete_by: deleteBy.toISOString(),
    archive_file: fileName,
    status_note: `Archived ${day(now)}. Backup file: ${fileName}. Keep until ${day(deleteBy)}.`,
    updated_at: now.toISOString(),
  }).eq('id', prep.tenant.id).eq('status', 'deactivated')
  if (error) throw new Error(`tenants: ${error.message}`)
  log(`tenants: marked as archived (keep the file until ${day(deleteBy)})`)
  return { deleteBy }
}

// The tool needs the SECRET key. The public (anon) key can read nothing and write nothing,
// which would also make a database that is not empty look empty.
export function keyRole(key) {
  if (key.startsWith('sb_secret_')) return 'service_role'
  if (key.startsWith('sb_publishable_')) return 'anon'
  try {
    const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role || 'unknown'
  } catch {
    return 'unknown'
  }
}

// Narrow a FULL backup down to one business, so a single business can be restored from it
export function filterToBusiness(backup, wanted) {
  const tenants = backup.tables.tenants || []
  const match = tenants.filter((t) => t.id === wanted || String(t.name).toLowerCase() === wanted.toLowerCase())
  if (match.length !== 1) {
    throw new Error(match.length === 0
      ? `No business called "${wanted}" in this backup.`
      : `More than one business matches "${wanted}". Use its id instead.`)
  }
  const id = match[0].id
  const tables = {}
  for (const [name, rows] of Object.entries(backup.tables)) {
    if (name === 'referrers') continue
    const col = name === 'tenants' ? 'id' : name === 'referrals' ? 'referred_tenant_id' : 'tenant_id'
    tables[name] = rows.filter((r) => r[col] === id)
  }
  return { ...backup, tables, isFull: false }
}

async function main() {
  const args = process.argv.slice(2)
  const file = args.find((a) => !a.startsWith('--'))
  const mode = (args.find((a) => a.startsWith('--mode=')) || '').split('=')[1]
  const ignoreProblems = args.includes('--ignore-problems')
  const minDaysArg = (args.find((a) => a.startsWith('--min-days=')) || '').slice('--min-days='.length)
  const businessArg = (args.find((a) => a.startsWith('--business=')) || '').slice('--business='.length)

  if (!file || !['check', 'add', 'replace', 'rebuild', 'archive'].includes(mode)) {
    console.log(`Usage: node tools/restore.mjs <backup.zip> --mode=check|add|replace|rebuild|archive

  check    Compare the backup with the database. Changes nothing.
  add      Put back rows that are missing. Never changes or deletes anything.
  replace  Make ONE business match the backup (a single-business backup, or add --business="Name" to pick one out of a full backup).
  rebuild  Load a FULL backup into an EMPTY database (after schema.sql has been run).
  archive  Delete a long-deactivated business's data from the LIVE database, after checking the
           backup matches it exactly. Needs --business="Name" (or a single-business backup).

Set RESTORE_SUPABASE_URL and RESTORE_SUPABASE_SERVICE_KEY first.`)
    process.exit(1)
  }

  const url = process.env.RESTORE_SUPABASE_URL
  const key = process.env.RESTORE_SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('Please set RESTORE_SUPABASE_URL and RESTORE_SUPABASE_SERVICE_KEY first.')
    process.exit(1)
  }

  if (keyRole(key) !== 'service_role') {
    console.error(`That key is not the secret service_role key (it looks like: ${keyRole(key)}).
Open the project's Project Settings > API Keys and copy the SECRET key (service_role), not the public/anon one.`)
    process.exit(1)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const readline = await import('node:readline/promises')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => rl.question(q)

  try {
    let backup = await readBackup(new Uint8Array(fs.readFileSync(file)))
    if (businessArg) backup = filterToBusiness(backup, businessArg)
    if (backup.hasProblems && !ignoreProblems) {
      console.error('This backup says it may be incomplete (see summary.txt). Take a new backup, or add --ignore-problems if you accept that.')
      process.exit(1)
    }
    if (mode === 'replace' && backup.isFull) {
      console.error('"replace" needs a backup of ONE business. This is a full backup. Use the single-business backup of the business you want to restore.')
      process.exit(1)
    }
    if (mode === 'rebuild' && !backup.isFull) {
      console.error('"rebuild" needs a FULL backup.')
      process.exit(1)
    }

    const client = createClient(url, key, { auth: { persistSession: false } })
    console.log(`\nDatabase: ${new URL(url).host}`)
    console.log(`Backup:   ${file} (${backup.isFull ? 'all businesses' : backup.tables.tenants?.[0]?.name})`)
    console.log(`Mode:     ${mode}`)

    if (mode === 'rebuild') {
      const { count } = await client.from('tenants').select('id', { count: 'exact', head: true })
      if (count > 0) {
        console.error('\nThat database already has businesses in it. "rebuild" only works on an EMPTY database.')
        process.exit(1)
      }
    }

    if (mode === 'archive') {
      const minDays = minDaysArg ? Number(minDaysArg) : RETENTION_DAYS
      if (!Number.isInteger(minDays) || minDays < 0) throw new Error('--min-days must be a whole number.')
      if (minDays < RETENTION_DAYS) console.log(`\nNOTE: waiting period lowered to ${minDays} days (normal: ${RETENTION_DAYS}).`)

      const prep = await prepareArchive(client, backup, { minDays })
      const total = printArchive(prep)
      if (prep.blockers.length) {
        console.error('\nSTOPPED. The backup does not match the live data, so deleting could lose something:')
        for (const b of prep.blockers) console.error('  - ' + b)
        console.error('Take a NEW backup of this business now, then try again.')
        process.exit(1)
      }
      if (total === 0) {
        console.log("\nAll of this business's data is already deleted. It only needs to be marked as archived.")
      }

      const name = prep.tenant.name
      console.log('\nThe backup file below must be saved somewhere safe BEFORE you continue:')
      console.log('  ' + file)
      if ((await ask(`\nType the business name exactly (${name}): `)) !== name) return console.log('Cancelled. Nothing was changed.')
      if ((await ask('Type ARCHIVE to continue: ')) !== 'ARCHIVE') return console.log('Cancelled. Nothing was changed.')

      const { deleteBy } = await applyArchive(client, prep, { file }, (m) => console.log('  ' + m))
      console.log(`\nDone. Keep the backup file safe until ${deleteBy.toISOString().slice(0, 10)}, then delete it.`)
      return
    }

    const planned = await buildPlan(client, backup, mode)
    const totals = printPlan(planned)
    if (mode !== 'rebuild') {
      const conflicts = await findEmailConflicts(client, planned)
      if (conflicts.length) {
        console.error('\nThese staff emails already belong to a DIFFERENT account in this database (someone signed up again with them):')
        for (const e of conflicts) console.error('  - ' + e)
        console.error('Sort that out first (for example ask them to use another email, or remove the new account), then run this again.')
        if (mode !== 'check') process.exit(1)
      }
    }
    if (mode === 'check') {
      return console.log(totals.differences === 0
        ? '\nEverything in the database matches the backup. Nothing was changed.'
        : `\n${totals.differences} differences found. Nothing was changed.`)
    }
    if (totals.add + totals.restore + totals.remove === 0) return console.log('\nNothing to do. The database already matches.')

    let ok
    if (mode === 'replace') {
      const name = backup.tables.tenants[0].name
      if (totals.remove > 0) console.log(`\nWARNING: ${totals.remove} rows made after this backup will be DELETED, and staff passwords go back to what they were then.`)
      ok = (await ask(`\nTo continue, type the business name exactly (${name}): `)) === name
    } else if (mode === 'rebuild') {
      ok = (await ask('\nThis will fill the database above. Type REBUILD to continue: ')) === 'REBUILD'
    } else {
      ok = (await ask('\nType yes to continue: ')).toLowerCase() === 'yes'
    }
    if (!ok) return console.log('Cancelled. Nothing was changed.')

    await applyActions(client, actionsFor(planned), (m) => console.log('  ' + m))
    console.log('\nDone. Run the same command with --mode=check to confirm everything now matches.')
  } finally {
    rl.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('\nStopped:', err.message)
    if (/row-level security|permission denied|invalid api key/i.test(err.message)) {
      console.error('Hint: this usually means the key is the public (anon) key. Use the SECRET service_role key of the project.')
    }
    console.error('Nothing is lost. If this was a rebuild, carry on with the same backup file and --mode=add. For add or replace, just run the same command again.')
    process.exit(1)
  })
}