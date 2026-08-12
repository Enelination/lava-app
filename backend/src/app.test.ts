import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import request from 'supertest'
import app from './app.js'

function fakeResponse(rows: unknown[]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => rows,
    headers: { get: () => null },
    text: async () => '',
  } as unknown as Response
}

async function fakeFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method || 'GET'
  const isUsers = url.includes('/rest/v1/users')
  const isSubmissions = url.includes('/rest/v1/submissions')

  if (isSubmissions && method === 'GET') {
    return fakeResponse([{ id: 'a' }, { id: 'b' }])
  }
  if (isUsers && method === 'GET') {
    return fakeResponse([])
  }
  if (isUsers && method === 'POST') {
    // capture the (already-bcrypt-hashed) password so tests can assert on it
    const body = JSON.parse(String(init?.body || '{}'))
    const saved = { id: 'u1', name: body.name, email: body.email, licence_number: body.licence_number, organisation: body.organisation, role: body.role, password: body.password }
    return fakeResponse([saved])
  }
  return fakeResponse([])
}

let capturedFetchCalls: { url: string; init?: RequestInit }[] = []

beforeEach(() => {
  capturedFetchCalls = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    capturedFetchCalls.push({ url, init })
    return fakeFetch(url, init)
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('app', () => {
  it('exposes a health endpoint', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('rejects an invalid registration with 400 and no DB writes', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: '', email: 'bad', password: 'x' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeTruthy()
    expect(capturedFetchCalls.length).toBe(0)
  })

  it('registers a user and hashes the password before storing it', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Kofi',
      email: 'kofi@survey.gh',
      password: 'supersecret1',
      licence_number: 'GHIS/VS/0042',
    })

    expect(res.status).toBe(200)
    expect(res.body.user.role).toBe('surveyor')
    expect(res.body.token).toBeTruthy()

    const insert = capturedFetchCalls.find((c) => c.url.includes('/rest/v1/users') && c.init?.method === 'POST')
    expect(insert).toBeTruthy()
    const stored = JSON.parse(String(insert!.init!.body))
    expect(stored.password).not.toBe('supersecret1')
    expect(String(stored.password).startsWith('$2')).toBe(true)
  })

  it('requires auth to create a submission', async () => {
    const res = await request(app).post('/api/submissions').send({ price: 50000 })
    expect(res.status).toBe(401)
  })

  it('lists submissions (paged helper returns the full set)', async () => {
    const res = await request(app).get('/api/submissions')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})
