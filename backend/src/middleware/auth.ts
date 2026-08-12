import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { selectRows } from '../lib/supabase.js'
import { logger } from '../lib/logger.js'
import type { JwtPayload } from '../types.js'

const NODE_ENV = process.env.NODE_ENV || 'development'

let JWT_SECRET: string = process.env.JWT_SECRET || ''
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    // Fail fast: refusing to boot beats silently invalidating every session on restart.
    throw new Error('JWT_SECRET must be set in production. Set it as an environment variable and redeploy.')
  }
  JWT_SECRET = randomBytes(32).toString('hex')
  logger.warn(
    'JWT_SECRET not set — generated an ephemeral secret. All sessions will be invalidated on every server restart. Set JWT_SECRET in production.'
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
