import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, ShieldCheck, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { admin as adminApi } from '../lib/api'
import { useAuth } from '../store/authStore'
import { getRoleLabel } from '../lib/utils'
import type { User } from '../types'

const inputCls =
  'w-full border border-line rounded-sm2 bg-paper px-3 py-2.5 text-xs text-ink outline-none focus:border-muted transition-colors placeholder:text-[#b0bcc3]'

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { users } = await adminApi.users()
      setUsers(users)
    } catch (err: any) {
      toast.error(err.message || 'Could not load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.name, u.email, u.licence_number, u.organisation, u.role]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [users, query])

  const setRole = async (id: string, role: string) => {
    setBusy(id)
    try {
      await adminApi.setRole(id, role)
      toast.success(role === 'officer' ? 'Promoted to verifier.' : 'Reverted to surveyor.')
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Could not update role.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">Admin</div>
          <h1>Users.</h1>
          <p>Promote surveyors to verifiers — not every surveyor is a verifier.</p>
        </div>
        <button onClick={load} disabled={loading} className="button outline flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or licence…"
          className={`${inputCls} pl-8`}
        />
      </div>

      <div className="panel">
        <div className="records userLog">
          <div className="recordHeader userRow">
            <span>User</span>
            <span>Licence</span>
            <span>Role</span>
            <span>Joined</span>
            <span>Action</span>
          </div>
          {loading ? (
            <div className="record userRow">
              <span className="recordSmall">Loading users…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="record userRow">
              <span className="recordSmall">
                {query.trim() ? 'No users match your search.' : 'No users yet.'}
              </span>
            </div>
          ) : (
            filtered.map((u) => (
              <div className="record userRow" key={u.id}>
                <span className="min-w-0">
                  <span className="block text-ink font-semibold text-[12px] truncate">
                    {u.name} {me?.id === u.id && <span className="text-muted font-normal">(you)</span>}
                  </span>
                  <span className="recordSmall block truncate">{u.email}</span>
                </span>
                <span className="recordSmall">{u.licence_number || '—'}</span>
                <span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded"
                    style={{
                      background:
                        u.role === 'admin'
                          ? 'var(--approve-bg, rgba(22,163,74,0.12))'
                          : u.role === 'officer'
                            ? 'var(--flag-bg, rgba(217,119,6,0.12))'
                            : u.role === 'surveyor'
                              ? 'var(--info-bg, rgba(2,132,199,0.1))'
                              : 'rgba(100,116,139,0.12)',
                      color:
                        u.role === 'admin'
                          ? 'var(--approve-text, #15803d)'
                          : u.role === 'officer'
                            ? 'var(--flag-text, #b45309)'
                            : u.role === 'surveyor'
                              ? '#0369a1'
                              : '#64748b',
                    }}
                  >
                    {getRoleLabel(u.role)}
                  </span>
                </span>
                <span className="recordSmall">{fmtDate(u.created_at || '')}</span>
                <span>
                  {me?.id !== u.id && u.role === 'surveyor' && (
                    <button
                      onClick={() => setRole(u.id, 'officer')}
                      disabled={busy === u.id}
                      className="button approve"
                    >
                      <ShieldCheck size={13} /> {busy === u.id ? '…' : 'Make verifier'}
                    </button>
                  )}
                  {me?.id !== u.id && u.role === 'officer' && (
                    <button
                      onClick={() => setRole(u.id, 'surveyor')}
                      disabled={busy === u.id}
                      className="button outline"
                    >
                      <Undo2 size={13} /> {busy === u.id ? '…' : 'Revert'}
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
