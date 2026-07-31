import { Router, Request, Response } from 'express'
import { selectRows, upsertRows } from '../lib/supabase.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const settings = await selectRows('settings')
    const result: Record<string, string> = {}
    for (const s of settings) {
      result[s.key] = s.value
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const updates = req.body
    const rows = Object.entries(updates).map(([key, value]) => ({ key, value: String(value) }))
    await upsertRows('settings', rows, 'key')
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
