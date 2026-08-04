import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { audit as auditApi } from '../lib/api'
import type { AuditLog } from '../types'

const inputCls =
  'w-full border border-line rounded-sm2 bg-paper px-3 py-2.5 text-xs text-ink outline-none focus:border-muted transition-colors placeholder:text-[#b0bcc3]'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function describe(a: AuditLog): string {
  const d = a.details || {}
  if (a.action === 'login') return 'Signed in'
  if (a.action === 'login_failed') return 'Failed login attempt'
  if (d.newStatus) return `${d.oldStatus || '?'} → ${d.newStatus}`
  if (d.newTrust) return `Trust ${d.oldTrust || '?'} → ${d.newTrust}`
  return a.action.replace('submission_', '')
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const load = async () => {
    setLoading(true)
    try {
      setLogs(await auditApi.list())
    } catch (err: any) {
      toast.error(err.message || 'Could not load audit log.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = logs
    if (q) {
      list = list.filter((l) =>
        [l.actor_name, l.actor_id, l.action, describe(l), l.target_type, JSON.stringify(l.details || {})]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    }
    const sorted = [...list]
    switch (sortBy) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'actor':
        sorted.sort((a, b) => (a.actor_name || '').localeCompare(b.actor_name || ''))
        break
      case 'action':
        sorted.sort((a, b) => describe(a).localeCompare(describe(b)))
        break
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return sorted
  }, [logs, query, sortBy])

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">Admin</div>
          <h1>Audit trail.</h1>
          <p>Who did what, and when — including sign-ins. Logs are kept for 5 days.</p>
        </div>
        <button onClick={load} disabled={loading} className="button outline flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="listToolbar">
        <label className="field">
          <span>Search</span>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by actor or action…"
              className="pl-8"
            />
          </div>
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="actor">By actor (A–Z)</option>
            <option value="action">By action (A–Z)</option>
          </select>
        </label>
      </div>

      <div className="panel">
        <div className="records auditLog">
          <div className="recordHeader auditRow">
            <span>When</span>
            <span>Who</span>
            <span>Action</span>
            <span>Change</span>
          </div>
          {loading ? (
            <div className="record auditRow">
              <span className="recordSmall">Loading audit log…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="record auditRow">
              <span className="recordSmall">
                {query.trim() ? 'No logs match your search.' : 'No audit entries yet.'}
              </span>
            </div>
          ) : (
            filtered.map((log) => (
              <div className="record auditRow" key={log.id}>
                <span className="recordSmall">{fmtDate(log.created_at)}</span>
                <span>{log.actor_name || log.actor_id || 'System'}</span>
                <span className="recordSmall">{describe(log)}</span>
                <span className="recordSmall font-mono">
                  {log.target_id ? log.target_id.slice(0, 8) : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
