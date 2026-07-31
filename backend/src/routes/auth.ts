import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { selectRows, insertRow, updateRows } from '../lib/supabase.js'
import { signToken, authenticate } from '../middleware/auth.js'
import type { User } from '../types.js'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, licence_number, organisation } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const existing = await selectRows('users', { where: { email: email.toLowerCase() }, select: 'id' })
    if (existing.length) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const id = uuid()
    const hash = bcrypt.hashSync(password, 10)
    const role = licence_number ? 'surveyor' : 'public'

    const user = await insertRow('users', {
      id,
      name,
      email: email.toLowerCase(),
      password: hash,
      licence_number: licence_number ? licence_number.toUpperCase() : null,
      organisation: organisation || null,
      role,
    })

    const token = signToken({ userId: id, role })
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        licence_number: user.licence_number,
        organisation: user.organisation,
        role: user.role,
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, licence_number, password } = req.body
    if ((!email && !licence_number) || !password) {
      return res.status(400).json({ error: 'Email/licence and password are required' })
    }

    let rows: any[] = []
    if (email) {
      rows = await selectRows('users', { where: { email: email.toLowerCase() } })
    } else if (licence_number) {
      rows = await selectRows('users', { where: { licence_number: licence_number.toUpperCase() } })
    }

    const user = rows[0] as User | undefined
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
        role: user.role,
      },
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' })
  }
})

router.patch('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const { name, email, licence_number, organisation } = req.body

    const updates: Record<string, unknown> = {}
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: 'Name cannot be empty' })
      updates.name = String(name).trim()
    }
    if (email !== undefined) {
      const normalized = String(email).toLowerCase().trim()
      if (!normalized) return res.status(400).json({ error: 'Email cannot be empty' })
      const existing = await selectRows('users', { where: { email: normalized }, select: 'id' })
      if (existing.length && existing[0].id !== userId) {
        return res.status(409).json({ error: 'Email already in use' })
      }
      updates.email = normalized
    }
    if (licence_number !== undefined) {
      updates.licence_number = licence_number ? String(licence_number).toUpperCase().trim() : null
    }
    if (organisation !== undefined) {
      updates.organisation = organisation ? String(organisation).trim() : null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const current = (await selectRows('users', { where: { id: userId } }))[0]
    if (current && current.role === 'public' && updates.licence_number) {
      updates.role = 'surveyor'
    }

    const rows = await updateRows('users', { id: userId }, updates)
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })
    const { password: _pw, ...safe } = user
    res.json({ user: safe })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Profile update failed' })
  }
})

router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }
    const rows = await selectRows('users', { where: { id: userId } })
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (!bcrypt.compareSync(String(current_password), user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    const hash = bcrypt.hashSync(String(new_password), 10)
    await updateRows('users', { id: userId }, { password: hash })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password change failed' })
  }
})

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user
    const rows = await selectRows('users', {
      where: { id: userId },
      select: 'id,name,email,licence_number,organisation,role,created_at',
    })
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
