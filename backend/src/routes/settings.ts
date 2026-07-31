import { Router, Request, Response } from 'express'
import { getDb } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, requireRole('admin'), (_req: Request, res: Response) => {
  try {
    const db = getDb()
    const settings = db.prepare('SELECT * FROM settings').all() as any[]
    const result: Record<string, string> = {}
    for (const s of settings) {
      result[s.key] = s.value
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb()
    const updates = req.body

    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    const transaction = db.transaction((settings: Record<string, string>) => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(key, value)
      }
    })

    transaction(updates)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
