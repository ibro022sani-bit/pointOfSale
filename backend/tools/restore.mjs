// Restore tool for Kasuwana backups. Runs on YOUR computer, never on the website.
//
//   node tools/restore.mjs <backup.zip> --mode=check|add|replace|rebuild
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
  const businessArg = (args.find((a) => a.startsWith('--business=')) || '').slice('--business='.length)

  if (!file || !['check', 'add', 'replace', 'rebuild'].includes(mode)) {
    console.log(`Usage: node tools/restore.mjs <backup.zip> --mode=check|add|replace|rebuild

  check    Compare the backup with the database. Changes nothing.
  add      Put back rows that are missing. Never changes or deletes anything.
  replace  Make ONE business match the backup (needs a single-business backup).
  rebuild  Load a FULL backup into an EMPTY database (after schema.sql has been run).

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
Open the practice project's Project Settings > API Keys and copy the SECRET key (service_role), not the public/anon one.`)
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

    const planned = await buildPlan(client, backup, mode)
    const totals = printPlan(planned)
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
      console.error('Hint: this usually means the key is the public (anon) key. Use the SECRET service_role key of the practice project.')
    }
    console.error('Nothing is lost. If this was a rebuild, carry on with the same backup file and --mode=add. For add or replace, just run the same command again.')
    process.exit(1)
  })
}