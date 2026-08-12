import { describe, it, expect, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { validate } from './validate.js'
import { registerSchema, loginSchema, updateSubmissionSchema } from '../schemas.js'

function runValidate(schema: Parameters<typeof validate>[0], body: unknown) {
  const req = { body } as Request
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
  const next = vi.fn() as NextFunction
  validate(schema)(req, res, next)
  return { req, res, next }
}

describe('validate middleware', () => {
  it('rejects an invalid body with 400 and a message', () => {
    const { res, next } = runValidate(registerSchema, { name: '', email: 'nope', password: 'short' })
    expect(res.status).toHaveBeenCalledWith(400)
    const json = (res.json as any).mock.calls[0][0]
    expect(json.error).toBeTruthy()
    expect(json.issues).toBeInstanceOf(Array)
    expect(next).not.toHaveBeenCalled()
  })

  it('accepts a valid body and passes the sanitized data through', () => {
    const { req, next } = runValidate(registerSchema, {
      name: '  Kofi Mensah  ',
      email: ' KOFI@survey.gh ',
      password: 'longenoughpass',
      licence_number: ' ghis/vs/0042 ',
    })
    expect(next).toHaveBeenCalled()
    expect(req.body.name).toBe('Kofi Mensah')
    expect(req.body.email).toBe('kofi@survey.gh')
    expect(req.body.licence_number).toBe('GHIS/VS/0042')
  })

  it('login requires email or licence number', () => {
    const { res } = runValidate(loginSchema, { password: 'secret1' })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('submission update requires at least one known field', () => {
    const { res } = runValidate(updateSubmissionSchema, { status: 'Nonsense' })
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
