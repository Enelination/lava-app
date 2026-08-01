import { Router, Request, Response } from 'express'
import { selectRows, countRows, updateRows } from '../lib/supabase.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const notifications = await selectRows('notifications', {
      where: { user_id: userId },
      order: 'created_at.desc',
      limit: 50,
    })
    const unread = await countRows('notifications', { user_id: userId, read: false })
    res.json({ notifications, unread })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const { ids } = req.body || {}
    if (Array.isArray(ids) && ids.length) {
      for (const nid of ids) {
        await updateRows('notifications', { id: nid, user_id: userId }, { read: true }).catch(() => {})
      }
    } else {
      await updateRows('notifications', { user_id: userId, read: false }, { read: true })
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
