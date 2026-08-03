import { Router, Request, Response } from 'express'
import { v4 as uuid } from 'uuid'
import { selectRows, insertRow, updateRows, deleteRows } from '../lib/supabase.js'
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

    const cleanContent = String(content).replace(/\u0000/g, '')
    const id = uuid()
    const wordCount = cleanContent.split(/\s+/).length

    await insertRow('knowledge_base', {
      id,
      name,
      content: cleanContent,
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

router.get('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const rows = await selectRows('knowledge_base', {
      where: { id },
      select: 'id,name,content,type,word_count,created_at',
    })
    const doc = rows[0]
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json(doc)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, content } = req.body

    const rows = await selectRows('knowledge_base', { where: { id }, select: 'id,type' })
    const doc = rows[0]
    if (!doc || doc.type !== 'uploaded') {
      return res.status(404).json({ error: 'Uploaded document not found' })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Name cannot be empty' })
      updates.name = String(name).trim()
    }
    if (content !== undefined) {
      const clean = String(content).replace(/\u0000/g, '')
      updates.content = clean
      updates.word_count = clean.split(/\s+/).length
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const updated = await updateRows('knowledge_base', { id }, updates)
    const saved = await selectRows('knowledge_base', {
      where: { id },
      select: 'id,name,type,word_count,created_at',
    })
    res.json(updated.length ? saved[0] : { error: 'Document not found' })
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
