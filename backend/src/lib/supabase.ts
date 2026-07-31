import bcrypt from 'bcryptjs'

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://ggewqgaeoiahegeexvzs.supabase.co').replace(/\/+$/, '')
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZXdxZ2Flb2lhaGVnZWV4dnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzkyOTEsImV4cCI6MjA5OTcxNTI5MX0.l-XGjUG4FrtNqsPnj07kVcCsZ9SzPNghAKrr--cN5dI'

export type Row = Record<string, any>

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('apikey', SUPABASE_ANON_KEY)
  headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
  if (init.body) headers.set('Content-Type', 'application/json')

  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    let msg = `Supabase ${res.status}`
    try {
      const body = await res.json()
      msg = body.message || body.error?.message || msg
    } catch {
      /* keep default */
    }
    throw new Error(msg)
  }
  return res
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

function whereClause(where: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(where)) {
    if (value === null || value === undefined) out[key] = 'is.null'
    else if (typeof value === 'object' && 'op' in value && 'value' in value) {
      const op = String((value as { op: unknown }).op)
      const val = (value as { value: unknown }).value
      out[key] = `${op}.${String(val)}`
    } else out[key] = `eq.${String(value)}`
  }
  return out
}

export interface SelectOptions {
  select?: string
  where?: Record<string, unknown>
  order?: string
  limit?: number
  offset?: number
}

export async function selectRows(table: string, opts: SelectOptions = {}): Promise<Row[]> {
  const params: Record<string, string | number> = {}
  if (opts.select && opts.select !== '*') params.select = opts.select
  if (opts.where) Object.assign(params, whereClause(opts.where))
  if (opts.order) params.order = opts.order
  if (opts.limit !== undefined) params.limit = opts.limit
  if (opts.offset !== undefined) params.offset = opts.offset

  const res = await request(`/rest/v1/${table}${buildQuery(params)}`)
  const rows = await res.json()
  return Array.isArray(rows) ? rows : []
}

export async function countRows(table: string, where?: Record<string, unknown>): Promise<number> {
  const params: Record<string, string | number> = { select: 'id' }
  if (where) Object.assign(params, whereClause(where))

  const res = await request(`/rest/v1/${table}${buildQuery(params)}`, {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  })
  const contentRange = res.headers.get('content-range')
  if (contentRange) {
    const n = parseInt(contentRange.split('/')[1], 10)
    if (!isNaN(n)) return n
  }
  const text = await res.text()
  const rows = JSON.parse(text)
  return Array.isArray(rows) ? rows.length : 0
}

export async function insertRow(table: string, data: Row): Promise<Row> {
  const res = await request(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(data),
  })
  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] : rows
}

export async function upsertRows(table: string, rows: Row[], onConflict: string): Promise<Row[]> {
  const res = await request(`/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function updateRows(
  table: string,
  where: Record<string, unknown>,
  data: Row
): Promise<Row[]> {
  const res = await request(`/rest/v1/${table}${buildQuery(whereClause(where))}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(data),
  })
  const rows = await res.json()
  return Array.isArray(rows) ? rows : []
}

export async function deleteRows(table: string, where: Record<string, unknown>): Promise<void> {
  await request(`/rest/v1/${table}${buildQuery(whereClause(where))}`, { method: 'DELETE' })
}

const BUILTIN_DOCS = [
  { id: 'kb-mca', name: 'Market_Comparison_GPT_Instruction.pdf', content: 'Market Comparison Analysis (MCA) methodology for Ghana property valuation. Select 3 or more comparable properties. Apply adjustments of 1-10% for: Location, Land Size, Constructional Details, General Conditions, No. of Bedrooms, Sale Date, Services, Legal Interest. Calculate Total Adjustment Percentage. Adjusted Rate = Base Rate x (1 + Total%/100). Average adjusted rates across comparables. Multiply by subject property area for Final Value.', type: 'builtin' },
  { id: 'kb-ghis', name: 'Standard_GhIS_Valuation_Report_Format.docx', content: 'GhIS Valuation Report Format: 1. Purpose of Valuation 2. Basis of Value 3. Valuation Date 4. Title/Legal Interest 5. Market Data 6. Neighbourhood Description 7. Property Description 8. Comparable Analysis 9. Valuation Opinion 10. Certification. All reports must follow this structure for GhIS compliance.', type: 'builtin' },
  { id: 'kb-stamp', name: 'Stamp_Duty_Valuation_GPT_Logic.docx', content: 'Stamp Duty Act (Act 689) Ghana: Conveyance duty rates: 0.5% of consideration up to GHS 100,000,000; 1% of consideration above GHS 100,000,000. Lease duty: 0.5% of total rent for first 5 years, 0.1% for remaining term. Mortgage duty: 0.5% of amount secured.', type: 'builtin' },
  { id: 'kb-landact', name: 'LAND_ACT_2020_Act_1036.pdf', content: 'Ghana Land Act 2020 (Act 1036): Key provisions for valuation. Stool lands are vested in the appropriate stool on behalf of the community. Family lands are held by family heads. State lands are vested in the President. Freehold represents the highest interest. Leasehold interests are for a defined term. Market value is the highest price reasonably obtainable.', type: 'builtin' },
  { id: 'kb-stampact', name: 'ACT689_Stamp_Duty_Act.pdf', content: 'Stamp Duty Act (Act 689) 2005: Imposes stamp duties on instruments. Rates: Conveyance on sale 0.5% up to GHS 100M, 1% above GHS 100M. Lease 0.5% of avg annual rent x term. Mortgage 0.5% of amount secured. Exemptions for certain agricultural and charitable transfers.', type: 'builtin' },
]

async function seedUsers() {
  const count = await countRows('users')
  if (count > 0) return
  const hash = bcrypt.hashSync('lava2025', 10)
  await upsertRows(
    'users',
    [
      { id: 'admin-001', name: 'Louisa Hans-Jorie', email: 'admin@lava.gh', password: hash, licence_number: 'ADMIN', organisation: null, role: 'admin' },
      { id: 'surveyor-001', name: 'Kofi Mensah', email: 'kofi@survey.gh', password: hash, licence_number: 'GHIS/VS/0042', organisation: null, role: 'surveyor' },
      { id: 'officer-001', name: 'Ama Serwaa', email: 'ama@lava.gh', password: hash, licence_number: 'GHIS/VO/0018', organisation: null, role: 'officer' },
    ],
    'id'
  )
  console.log('Seeded demo users.')
}

async function seedKnowledgeBase() {
  const count = await countRows('knowledge_base')
  if (count > 0) return
  await upsertRows(
    'knowledge_base',
    BUILTIN_DOCS.map((d) => ({ ...d, word_count: d.content.split(/\s+/).length })),
    'id'
  )
  console.log('Seeded knowledge base documents.')
}

async function seedSettings() {
  const existing = await selectRows('settings', { where: { key: 'claude_api_key' }, select: 'key' })
  const claudeKey = process.env.CLAUDE_API_KEY || ''
  if (existing.length === 0 && claudeKey) {
    await insertRow('settings', { key: 'claude_api_key', value: claudeKey })
    console.log('Seeded Claude API key setting.')
  }
}

export async function pingSupabase(): Promise<{ ok: boolean; rows: number; error?: string }> {
  try {
    const rows = await countRows('submissions')
    return { ok: true, rows }
  } catch (err: any) {
    return { ok: false, rows: 0, error: err.message }
  }
}

export async function initSupabase(): Promise<boolean> {
  const ping = await pingSupabase()
  if (!ping.ok) {
    console.warn(
      `Supabase not reachable: ${ping.error}. If tables are missing, run backend/scripts/init-supabase.sql in the Supabase SQL editor.`
    )
    return false
  }
  console.log(`Supabase connected — ${ping.rows} submissions in database.`)
  try {
    await seedUsers()
    await seedKnowledgeBase()
    await seedSettings()
    return true
  } catch (err: any) {
    console.warn(
      `Supabase seeding incomplete: ${err.message}. Run backend/scripts/init-supabase.sql in the Supabase SQL editor.`
    )
    return false
  }
}
