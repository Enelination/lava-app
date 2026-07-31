import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../lib/database.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb()
    const { status, limit, offset } = req.query
    let query = 'SELECT * FROM submissions'
    const params: any[] = []

    if (status && status !== 'all') {
      query += ' WHERE status = ?'
      params.push(status)
    }

    query += ' ORDER BY submitted_at DESC'

    if (limit) {
      query += ' LIMIT ?'
      params.push(parseInt(limit as string))
    }
    if (offset) {
      query += ' OFFSET ?'
      params.push(parseInt(offset as string))
    }

    const rows = db.prepare(query).all(...params)
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/stats', (_req: Request, res: Response) => {
  try {
    const db = getDb()
    const total = (db.prepare('SELECT COUNT(*) as c FROM submissions').get() as any).c
    const verified = (db.prepare('SELECT COUNT(*) as c FROM submissions WHERE status = ?').get('Verified') as any).c
    const pending = (db.prepare('SELECT COUNT(*) as c FROM submissions WHERE status = ?').get('Pending') as any).c
    const flagged = (db.prepare('SELECT COUNT(*) as c FROM submissions WHERE status = ?').get('Flagged') as any).c
    const rejected = (db.prepare('SELECT COUNT(*) as c FROM submissions WHERE status = ?').get('Rejected') as any).c
    const regions = (db.prepare('SELECT COUNT(DISTINCT region) as c FROM submissions').get() as any).c

    res.json({ total, verified, pending, flagged, rejected, regions })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', authenticate, (req: Request, res: Response) => {
  try {
    const db = getDb()
    const { userId } = (req as any).user
    const id = uuid()
    const data = req.body

    db.prepare(`INSERT INTO submissions (id, property_type, region, district, community, gps_coordinates, land_size, unit, land_use, tenure_type, description, bedrooms, bathrooms, storeys, floor_area, building_age, condition, transaction_type, price, transaction_date, source, surveyor_name, licence_number, organisation, email, status, trust_score, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, data.property_type || 'Land', data.region || '', data.district || '', data.community || '',
      data.gps_coordinates || '', data.land_size || null, data.unit || 'Acres', data.land_use || '',
      data.tenure_type || '', data.description || '', data.bedrooms || null, data.bathrooms || null,
      data.storeys || null, data.floor_area || null, data.building_age || null, data.condition || null,
      data.transaction_type || 'Sale', data.price || 0, data.transaction_date || null, data.source || 'Direct transaction',
      data.surveyor_name || '', data.licence_number || '', data.organisation || '', data.email || '',
      'Pending', 'Medium', userId
    )

    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id)
    res.status(201).json(submission)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const db = getDb()
    const { id } = req.params
    const { status, trust_score } = req.body

    const existing = db.prepare('SELECT id FROM submissions WHERE id = ?').get(id)
    if (!existing) return res.status(404).json({ error: 'Submission not found' })

    const updates: string[] = []
    const params: any[] = []

    if (status) {
      updates.push('status = ?')
      params.push(status)
      if (status === 'Verified') {
        updates.push('verified_at = datetime(\'now\')')
      }
    }
    if (trust_score) {
      updates.push('trust_score = ?')
      params.push(trust_score)
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    params.push(id)
    db.prepare(`UPDATE submissions SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id)
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
