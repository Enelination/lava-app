import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { selectRows, insertRow, deleteRows } from '../lib/supabase.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await selectRows('knowledge_base', {
      select: 'id,name,type,word_count,created_at',
      order: 'type,name',
    })
    res.json(docs)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/upload', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, content } = req.body
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' })
    }

    const id = uuid()
    const wordCount = content.split(/\s+/).length

    await insertRow('knowledge_base', {
      id,
      name,
      content,
      type: 'uploaded',
      word_count: wordCount,
    })

    const rows = await selectRows('knowledge_base', {
      where: { id },
      select: 'id,name,type,word_count,created_at',
    })
    res.status(201).json(rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const rows = await selectRows('knowledge_base', { where: { id }, select: 'id,type' })
    const doc = rows[0]
    if (!doc || doc.type !== 'uploaded') {
      return res.status(404).json({ error: 'Uploaded document not found' })
    }

    await deleteRows('knowledge_base', { id })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
