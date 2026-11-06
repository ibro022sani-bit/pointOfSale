import { zip, strToU8 } from 'fflate'
import api from './api'
import { APP_NAME } from '../config/brand'

const PAGE = 500 // rows per request, small enough to stay far below the server's response limit
const PARALLEL = 3 // tables downloaded at the same time
const RETRIES = 2

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One spreadsheet cell: quotes anything with commas, quotes or line breaks
const csvCell = (value) => {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows) {
  if (!rows.length) return ''
  const columns = Object.keys(rows[0])
  const lines = [columns.map(csvCell).join(',')]
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(','))
  return lines.join('\r\n')
}

// Downloads one table, a page at a time, trying again if a request fails
async function fetchTable(name, tenantId) {
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    let page
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await api.get(`/api/platform/backup/table/${name}`, {
          params: { offset, limit: PAGE, ...(tenantId ? { tenant: tenantId } : {}) },
        })
        page = res.data.data
        break
      } catch (err) {
        if (attempt >= RETRIES) throw err
        await sleep(800 * (attempt + 1))
      }
    }
    rows.push(...page)
    if (page.length < PAGE) break
  }
  return rows
}

// Turns the downloaded tables into the files that go in the ZIP, plus a plain-language summary
export function buildBackupFiles({ plan, results, failed, schemaSql = null, now = new Date() }) {
  const { scope, business, tables, counts } = plan
  const files = {}
  const problems = []
  const rowLines = []

  for (const name of tables) {
    const rows = results[name] || []
    files[`json/${name}.json`] = strToU8(JSON.stringify(rows))
    // The byte-order mark makes Excel read ₦ and accented names correctly
    files[`csv/${name}.csv`] = strToU8('\uFEFF' + toCsv(rows))

    const expected = counts?.[name]
    let note = ''
    if (failed.includes(name)) {
      note = '   <-- COULD NOT BE READ'
      problems.push(`${name}: could not be read`)
    } else if (expected !== null && expected !== undefined && expected !== rows.length) {
      note = `   <-- expected ${expected}`
      problems.push(`${name}: got ${rows.length} rows but the database has ${expected}`)
    }
    rowLines.push(`  ${name}: ${rows.length}${note}`)
  }

  // The database structure, so a backup can rebuild everything from nothing
  if (schemaSql) {
    files['schema.sql'] = strToU8(schemaSql)
  } else if (scope === 'all') {
    problems.push('schema.sql: could not be created (a full backup needs it to rebuild from nothing)')
  }

  const summary = [
    `${APP_NAME} backup`,
    `Scope: ${scope === 'business' ? `One business (${business})` : 'All businesses'}`,
    `Created: ${now.toISOString()}`,
    '',
    'Rows per table:',
    ...rowLines,
    '',
    problems.length === 0
      ? 'Check: every table was downloaded in full.'
      : ['PROBLEMS FOUND. This backup may be incomplete:', ...problems.map((p) => `  - ${p}`),
         '(A small difference can simply mean sales were made while the backup was running. Run it again to be sure.)'].join('\n'),
    '',
    schemaSql ? 'Schema: included (schema.sql).' : 'Schema: NOT included.',
    '',
    'Inside this ZIP:',
    '  json/  an exact copy of every table (this is what a restore uses)',
    '  csv/   the same data for opening in Excel',
    '  schema.sql  the database structure (needed to rebuild from nothing)',
    '',
    'Keep this file safe. It contains customer names and phone numbers, and staff passwords in',
    'scrambled form. Do not send it by WhatsApp or email.',
  ].join('\n')
  files['summary.txt'] = strToU8(summary)

  return { files, problems }
}

function saveBlob(data, fileName) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// Backs up one business (pass tenantId) or everything (leave it out) and downloads a single ZIP
export async function downloadBackup({ tenantId = null, onProgress = () => {}, save = saveBlob } = {}) {
  const planRes = await api.get('/api/platform/backup/plan', { params: tenantId ? { tenant: tenantId } : {} })
  const plan = planRes.data.data

  // The database structure, so a backup can rebuild everything from nothing
  let schemaSql = null
  try {
    const schemaRes = await api.get('/api/platform/backup/schema')
    schemaSql = schemaRes.data.data.sql
  } catch {
    schemaSql = null
  }

  const results = {}
  const failed = []
  const queue = [...plan.tables]
  let done = 0
  onProgress({ done, total: plan.tables.length, current: 'Starting…' })

  const worker = async () => {
    while (queue.length) {
      const name = queue.shift()
      try {
        results[name] = await fetchTable(name, tenantId)
      } catch {
        failed.push(name)
        results[name] = []
      }
      done += 1
      onProgress({ done, total: plan.tables.length, current: name })
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))

  onProgress({ done: plan.tables.length, total: plan.tables.length, current: 'Packing the file…' })
  const { files, problems } = buildBackupFiles({ plan, results, failed, schemaSql })

  const zipped = await new Promise((resolve, reject) =>
    zip(files, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data)))
  )

  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const day = new Date().toISOString().slice(0, 10)
  const fileName = tenantId
    ? `${slug(APP_NAME)}-backup-${slug(plan.business)}-${day}.zip`
    : `${slug(APP_NAME)}-backup-all-${day}.zip`
  save(zipped, fileName)

  return { fileName, problems }
}