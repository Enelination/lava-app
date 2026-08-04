import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { selectRows } from '../lib/supabase.js'
import type { JwtPayload } from '../types.js'

let JWT_SECRET: string = process.env.JWT_SECRET || ''
if (!JWT_SECRET) {
  JWT_SECRET = randomBytes(32).toString('hex')
  console.warn(
    'WARNING: JWT_SECRET not set. Generated an ephemeral secret — all sessions will be invalidated on every server restart. Set JWT_SECRET in production.'
  )
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    const rows = await selectRows('users', { where: { id: decoded.userId }, select: 'id,role' })
    const user = rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    ;(req as any).user = { userId: user.id, role: user.role }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as JwtPayload
      ;(req as any).user = decoded
    } catch {
      /* ignore invalid tokens — treat as anonymous */
    }
  }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
