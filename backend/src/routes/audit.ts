import { Router, Request, Response } from 'express'
import { selectRows } from '../lib/supabase.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const logs = await selectRows('audit_logs', {
      select: 'id,actor_id,actor_name,action,target_type,target_id,details,created_at',
      order: 'created_at.desc',
      limit: 100,
    })
    res.json(logs)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
