import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { selectRows, countRows, insertRow, updateRows } from '../lib/supabase.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query
    const where = status && status !== 'all' ? { status: String(status) } : {}
    const rows = await selectRows('submissions', {
      where,
      order: 'submitted_at.desc',
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    })
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const total = await countRows('submissions')
    const verified = await countRows('submissions', { status: 'Verified' })
    const pending = await countRows('submissions', { status: 'Pending' })
    const flagged = await countRows('submissions', { status: 'Flagged' })
    const rejected = await countRows('submissions', { status: 'Rejected' })
    const regionRows = await selectRows('submissions', { select: 'region' })
    const regions = new Set(regionRows.map((r) => r.region).filter(Boolean)).size

    res.json({ total, verified, pending, flagged, rejected, regions })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const id = uuid()
    const data = req.body

    const row = await insertRow('submissions', {
      id,
      property_type: data.property_type || 'Land',
      region: data.region || '',
      district: data.district || '',
      community: data.community || '',
      gps_coordinates: data.gps_coordinates || '',
      land_size: data.land_size || null,
      unit: data.unit || 'Acres',
      land_use: data.land_use || '',
      tenure_type: data.tenure_type || '',
      description: data.description || '',
      bedrooms: data.bedrooms || null,
      bathrooms: data.bathrooms || null,
      storeys: data.storeys || null,
      floor_area: data.floor_area || null,
      building_age: data.building_age || null,
      condition: data.condition || null,
      transaction_type: data.transaction_type || 'Sale',
      price: data.price || 0,
      transaction_date: data.transaction_date || null,
      source: data.source || 'Direct transaction',
      surveyor_name: data.surveyor_name || '',
      licence_number: data.licence_number || '',
      organisation: data.organisation || '',
      email: data.email || '',
      status: 'Pending',
      trust_score: 'Medium',
      user_id: userId,
      submitted_at: new Date().toISOString(),
    })

    res.status(201).json(row)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, trust_score } = req.body

    const updates: Record<string, unknown> = {}
    if (status) {
      updates.status = status
      if (status === 'Verified') updates.verified_at = new Date().toISOString()
    }
    if (trust_score) {
      updates.trust_score = trust_score
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const rows = await updateRows('submissions', { id }, updates)
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' })

    res.json(rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
