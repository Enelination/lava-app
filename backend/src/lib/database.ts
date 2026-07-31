import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../data/lava.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  console.log('Opening database at', DB_PATH)
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema()
  seedData()
  console.log('Database ready at', DB_PATH)
  return db
}

function initSchema() {
  if (!db) return
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      licence_number TEXT,
      organisation TEXT,
      role TEXT DEFAULT 'public' CHECK(role IN ('public','surveyor','officer','admin')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      property_type TEXT DEFAULT 'Land',
      region TEXT DEFAULT '',
      district TEXT DEFAULT '',
      community TEXT DEFAULT '',
      gps_coordinates TEXT DEFAULT '',
      land_size REAL,
      unit TEXT DEFAULT 'Acres',
      land_use TEXT DEFAULT '',
      tenure_type TEXT DEFAULT '',
      description TEXT DEFAULT '',
      bedrooms TEXT,
      bathrooms TEXT,
      storeys TEXT,
      floor_area REAL,
      building_age INTEGER,
      condition TEXT,
      transaction_type TEXT DEFAULT 'Sale',
      price REAL DEFAULT 0,
      transaction_date TEXT,
      source TEXT DEFAULT 'Direct transaction',
      surveyor_name TEXT DEFAULT '',
      licence_number TEXT DEFAULT '',
      organisation TEXT DEFAULT '',
      email TEXT DEFAULT '',
      status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Verified','Flagged','Rejected')),
      trust_score TEXT DEFAULT 'Medium' CHECK(trust_score IN ('High','Medium','Low')),
      submitted_at TEXT DEFAULT (datetime('now')),
      verified_at TEXT,
      user_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'uploaded' CHECK(type IN ('builtin','uploaded')),
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_submissions_community ON submissions(community);
    CREATE INDEX IF NOT EXISTS idx_submissions_region ON submissions(region);
  `)
}

function seedData() {
  if (!db) return

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (count.c === 0) {
    const hash = bcrypt.hashSync('lava2025', 10)
    db.prepare(`INSERT INTO users (id, name, email, password, licence_number, role) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'admin-001', 'Louisa Hans-Jorie', 'admin@lava.gh', hash, 'ADMIN', 'admin'
    )
    db.prepare(`INSERT INTO users (id, name, email, password, licence_number, role) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'surveyor-001', 'Kofi Mensah', 'kofi@survey.gh', hash, 'GhIS/VS/0042', 'surveyor'
    )
    db.prepare(`INSERT INTO users (id, name, email, password, licence_number, role) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'officer-001', 'Ama Serwaa', 'ama@lava.gh', hash, 'GhIS/VO/0018', 'officer'
    )
  }

  const builtins = db.prepare('SELECT COUNT(*) as c FROM knowledge_base WHERE type = ?').get('builtin') as { c: number }
  if (builtins.c === 0) {
    const docs = [
      { id: 'kb-mca', name: 'Market_Comparison_GPT_Instruction.pdf', content: 'Market Comparison Analysis (MCA) methodology for Ghana property valuation. Select 3 or more comparable properties. Apply adjustments of 1-10% for: Location, Land Size, Constructional Details, General Conditions, No. of Bedrooms, Sale Date, Services, Legal Interest. Calculate Total Adjustment Percentage. Adjusted Rate = Base Rate x (1 + Total%/100). Average adjusted rates across comparables. Multiply by subject property area for Final Value.', type: 'builtin' },
      { id: 'kb-ghis', name: 'Standard_GhIS_Valuation_Report_Format.docx', content: 'GhIS Valuation Report Format: 1. Purpose of Valuation 2. Basis of Value 3. Valuation Date 4. Title/Legal Interest 5. Market Data 6. Neighbourhood Description 7. Property Description 8. Comparable Analysis 9. Valuation Opinion 10. Certification. All reports must follow this structure for GhIS compliance.', type: 'builtin' },
      { id: 'kb-stamp', name: 'Stamp_Duty_Valuation_GPT_Logic.docx', content: 'Stamp Duty Act (Act 689) Ghana: Conveyance duty rates: 0.5% of consideration up to GHS 100,000,000; 1% of consideration above GHS 100,000,000. Lease duty: 0.5% of total rent for first 5 years, 0.1% for remaining term. Mortgage duty: 0.5% of amount secured.', type: 'builtin' },
      { id: 'kb-landact', name: 'LAND_ACT_2020_Act_1036.pdf', content: 'Ghana Land Act 2020 (Act 1036): Key provisions for valuation. Stool lands are vested in the appropriate stool on behalf of the community. Family lands are held by family heads. State lands are vested in the President. Freehold represents the highest interest. Leasehold interests are for a defined term. Market value is the highest price reasonably obtainable.', type: 'builtin' },
      { id: 'kb-stampact', name: 'ACT689_Stamp_Duty_Act.pdf', content: 'Stamp Duty Act (Act 689) 2005: Imposes stamp duties on instruments. Rates: Conveyance on sale 0.5% up to GHS 100M, 1% above GHS 100M. Lease 0.5% of avg annual rent x term. Mortgage 0.5% of amount secured. Exemptions for certain agricultural and charitable transfers.', type: 'builtin' }
    ]
    const insert = db.prepare('INSERT INTO knowledge_base (id, name, content, type, word_count) VALUES (?, ?, ?, ?, ?)')
    for (const doc of docs) {
      insert.run(doc.id, doc.name, doc.content, doc.type, doc.content.split(/\s+/).length)
    }
  }

  const claudeKey = process.env.CLAUDE_API_KEY || ''
  const hasClaudeSetting = db.prepare('SELECT COUNT(*) as c FROM settings WHERE key = ?').get('claude_api_key') as { c: number }
  if (hasClaudeSetting.c === 0 && claudeKey) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('claude_api_key', claudeKey)
  }

  const hasRecs = db.prepare('SELECT COUNT(*) as c FROM submissions').get() as { c: number }
  if (hasRecs.c === 0) {
    const sampleRecs = [
      { community: 'Cantoments', region: 'Greater Accra', district: 'Accra', land_use: 'Residential', tenure_type: 'Freehold', price: 850000, land_size: 0.35, unit: 'Acres', surveyor_name: 'Kofi Mensah', licence_number: 'GhIS/VS/0042', status: 'Verified', trust_score: 'High' },
      { community: 'Ridge', region: 'Greater Accra', district: 'Accra', land_use: 'Commercial', tenure_type: 'Leasehold', price: 1200000, land_size: 0.5, unit: 'Acres', surveyor_name: 'Kofi Mensah', licence_number: 'GhIS/VS/0042', status: 'Verified', trust_score: 'High' },
      { community: 'Community 25', region: 'Greater Accra', district: 'Tema', land_use: 'Residential', tenure_type: 'Stool land', price: 320000, land_size: 0.25, unit: 'Acres', surveyor_name: 'Kofi Mensah', licence_number: 'GhIS/VS/0042', status: 'Verified', trust_score: 'Medium' },
      { community: 'Ayeduase', region: 'Ashanti', district: 'Kumasi', land_use: 'Residential', tenure_type: 'Family land', price: 280000, land_size: 0.3, unit: 'Acres', surveyor_name: 'Kofi Mensah', licence_number: 'GhIS/VS/0042', status: 'Pending', trust_score: 'Medium' },
      { community: 'Adum', region: 'Ashanti', district: 'Kumasi', land_use: 'Commercial', tenure_type: 'Leasehold', price: 950000, land_size: 0.15, unit: 'Acres', surveyor_name: 'Kofi Mensah', licence_number: 'GhIS/VS/0042', status: 'Verified', trust_score: 'High' },
      { community: 'Spintex', region: 'Greater Accra', district: 'Accra', land_use: 'Mixed use', tenure_type: 'Freehold', price: 680000, land_size: 0.4, unit: 'Acres', surveyor_name: 'Kofi Mensah', licence_number: 'GhIS/VS/0042', status: 'Flagged', trust_score: 'Medium' },
    ]
    const insert = db.prepare(`INSERT INTO submissions (id, community, region, district, land_use, tenure_type, price, land_size, unit, surveyor_name, licence_number, status, trust_score, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    for (const r of sampleRecs) {
      insert.run(uuid(), r.community, r.region, r.district, r.land_use, r.tenure_type, r.price, r.land_size, r.unit, r.surveyor_name, r.licence_number, r.status, r.trust_score, 'surveyor-001')
    }
  }
}
