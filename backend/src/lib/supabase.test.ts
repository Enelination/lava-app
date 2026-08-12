import { describe, it, expect, vi, afterEach } from 'vitest'
import { selectAllRows } from './supabase.js'

function fakeResponse(rows: unknown[]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => rows,
    headers: { get: () => null },
    text: async () => '',
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('selectAllRows', () => {
  it('returns a single page as-is when under the PostgREST cap', async () => {
    const page = Array.from({ length: 500 }, (_, i) => ({ id: `r${i}` }))
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(page))
    vi.stubGlobal('fetch', fetchMock)

    const rows = await selectAllRows('submissions')

    expect(rows).toHaveLength(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('pages through the full dataset beyond the 1000-row cap', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}` }))
    const page2 = Array.from({ length: 1000 }, (_, i) => ({ id: `r${i + 1000}` }))
    const page3 = Array.from({ length: 94 }, (_, i) => ({ id: `r${i + 2000}` }))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(page1))
      .mockResolvedValueOnce(fakeResponse(page2))
      .mockResolvedValueOnce(fakeResponse(page3))
    vi.stubGlobal('fetch', fetchMock)

    const rows = await selectAllRows('submissions', { where: { status: 'Verified' }, order: 'submitted_at.desc' })

    expect(rows).toHaveLength(2094)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('terminates when the dataset is an exact multiple of the page size', async () => {
    // 3000 rows = 3 full pages; the loop must fetch a 4th (empty) page and stop, not loop forever.
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}` }))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(full))
      .mockResolvedValueOnce(fakeResponse(full))
      .mockResolvedValueOnce(fakeResponse(full))
      .mockResolvedValueOnce(fakeResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    const rows = await selectAllRows('submissions')

    expect(rows).toHaveLength(3000)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
