import { Router, Request, Response } from 'express'
import { selectRows, updateRows, insertRow } from '../lib/supabase.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { updateRoleSchema } from '../schemas.js'

const router = Router()

router.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const rows = await selectRows('users', {
      select: 'id,name,email,licence_number,organisation,role,created_at',
      order: 'created_at.desc',
    })
    res.json({ users: rows })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/:id', authenticate, requireRole('admin'), validate(updateRoleSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body
    const actor = (req as any).user
    if (actor.userId === id) {
      return res.status(400).json({ error: 'You cannot change your own role' })
    }

    const current = (await selectRows('users', { where: { id }, select: 'id,name,role' }))[0]
    if (!current) return res.status(404).json({ error: 'User not found' })

    const rows = await updateRows('users', { id }, { role })
    if (!rows.length) return res.status(404).json({ error: 'User not found' })

    const { password: _pw, ...safe } = rows[0]

    if (current.role !== role) {
      const actorRow = (await selectRows('users', { where: { id: actor.userId }, select: 'name' }))[0] || {}
      await insertRow('audit_logs', {
        actor_id: actor.userId,
        actor_name: actorRow.name || actor.role,
        action: role === 'officer' ? 'promote_verifier' : 'role_change',
        target_type: 'user',
        target_id: id,
        details: { oldRole: current.role, newRole: role, userName: current.name },
        created_at: new Date().toISOString(),
      }).catch(() => {})
    }

    res.json(safe)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
