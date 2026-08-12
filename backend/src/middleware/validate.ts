import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

export function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues[0]?.message || 'Invalid request',
        issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    }
    req.body = result.data
    next()
  }
}
