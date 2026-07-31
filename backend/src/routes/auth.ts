import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { getDb } from '../lib/database.js'
import { signToken, authenticate } from '../middleware/auth.js'
import type { User } from '../types.js'

const router = Router()

router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, licence_number, organisation } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const id = uuid()
    const hash = bcrypt.hashSync(password, 10)
    const role = licence_number ? 'surveyor' : 'public'

    db.prepare(`INSERT INTO users (id, name, email, password, licence_number, organisation, role) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, name, email.toLowerCase(), hash, licence_number || null, organisation || null, role)

    const token = signToken({ userId: id, role })
    res.json({
      token,
      user: { id, name, email: email.toLowerCase(), licence_number: licence_number || null, organisation: organisation || null, role }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' })
  }
})

router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, licence_number, password } = req.body
    if ((!email && !licence_number) || !password) {
      return res.status(400).json({ error: 'Email/licence and password are required' })
    }

    const db = getDb()
    let user: User | undefined

    if (email) {
      user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as User | undefined
    } else if (licence_number) {
      user = db.prepare('SELECT * FROM users WHERE licence_number = ?').get(licence_number.toUpperCase()) as User | undefined
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken({ userId: user.id, role: user.role })
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        licence_number: user.licence_number,
        organisation: user.organisation,
        role: user.role
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' })
  }
})

router.get('/me', authenticate, (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const db = getDb()
    const user = db.prepare('SELECT id, name, email, licence_number, organisation, role, created_at FROM users WHERE id = ?').get(userId) as any
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
