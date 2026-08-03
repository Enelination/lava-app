import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { audit as auditApi } from '../lib/api'
import type { AuditLog } from '../types'

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
          ) : logs.length === 0 ? (
            <div className="record auditRow">
              <span className="recordSmall">No audit entries yet.</span>
            </div>
          ) : (
            logs.map((log) => (
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
