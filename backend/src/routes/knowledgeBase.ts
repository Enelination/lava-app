import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../lib/database.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb()
    const docs = db.prepare('SELECT id, name, type, word_count, created_at FROM knowledge_base ORDER BY type, name').all()
    res.json(docs)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/upload', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const { name, content } = req.body
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' })
    }

    const db = getDb()
    const id = uuid()
    const wordCount = content.split(/\s+/).length

    db.prepare('INSERT INTO knowledge_base (id, name, content, type, word_count) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, content, 'uploaded', wordCount)

    const doc = db.prepare('SELECT id, name, type, word_count, created_at FROM knowledge_base WHERE id = ?').get(id)
    res.status(201).json(doc)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', authenticate, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const db = getDb()
    const { id } = req.params
    const doc = db.prepare('SELECT * FROM knowledge_base WHERE id = ? AND type = ?').get(id, 'uploaded')
    if (!doc) return res.status(404).json({ error: 'Uploaded document not found' })

    db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(id)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
