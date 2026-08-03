import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { selectRows, countRows, insertRow, updateRows } from '../lib/supabase.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const VALID_STATUSES = ['Pending', 'Verified', 'Flagged', 'Rejected']
const VALID_TRUST = ['High', 'Medium', 'Low']

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

router.post('/', authenticate, requireRole('public', 'surveyor', 'officer', 'admin'), async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const id = uuid()
    const data = req.body

    const submitter = (await selectRows('users', { where: { id: userId }, select: 'name,licence_number,organisation,email' }))[0] || {}

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
      surveyor_name: submitter.name || '',
      licence_number: submitter.licence_number || '',
      organisation: submitter.organisation || '',
      email: submitter.email || '',
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

router.patch('/:id', authenticate, requireRole('officer', 'admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, trust_score } = req.body
    const actor = (req as any).user

    const current = (await selectRows('submissions', { where: { id } }))[0]
    if (!current) return res.status(404).json({ error: 'Submission not found' })

    const updates: Record<string, unknown> = {}
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      updates.status = status
      if (status === 'Verified') updates.verified_at = new Date().toISOString()
    }
    if (trust_score !== undefined) {
      if (!VALID_TRUST.includes(trust_score)) {
        return res.status(400).json({ error: 'Invalid trust score' })
      }
      updates.trust_score = trust_score
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const rows = await updateRows('submissions', { id }, updates)
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' })

    const statusChanged = status !== undefined && status !== current.status
    const trustChanged = trust_score !== undefined && trust_score !== current.trust_score

    const actorRow = (await selectRows('users', { where: { id: actor.userId }, select: 'id,name' }))[0] || {}
    const details: Record<string, unknown> = {}
    if (statusChanged) {
      details.oldStatus = current.status
      details.newStatus = status
    }
    if (trustChanged) {
      details.oldTrust = current.trust_score
      details.newTrust = trust_score
    }
    if (statusChanged || trustChanged) {
      await insertRow('audit_logs', {
        actor_id: actor.userId,
        actor_name: actorRow.name || actor.role,
        action: statusChanged ? `submission_${status}` : 'submission_trust',
        target_type: 'submission',
        target_id: id,
        details: Object.keys(details).length ? details : null,
        created_at: new Date().toISOString(),
      }).catch(() => {})
    }

    if (current.user_id && statusChanged) {
      const location = [current.community, current.district].filter(Boolean).join(', ') || current.region
      const msgMap: Record<string, string> = {
        Verified: `Your submission in ${location} was verified.`,
        Flagged: `Your submission in ${location} was flagged for review.`,
        Rejected: `Your submission in ${location} was rejected.`,
      }
      if (msgMap[status]) {
        await insertRow('notifications', {
          user_id: current.user_id,
          type: `submission_${status.toLowerCase()}`,
          title: `Submission ${status.toLowerCase()}`,
          message: msgMap[status],
          target_id: id,
          read: false,
          created_at: new Date().toISOString(),
        }).catch(() => {})
      }
    }

    res.json(rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
