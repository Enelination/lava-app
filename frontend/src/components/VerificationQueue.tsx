import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Check, Flag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { submissions as submissionsApi } from '../lib/api'
import { useApp } from '../store/appStore'
import { formatCurrency } from '../lib/utils'
import type { Submission } from '../types'

const filters = ['All', 'Pending', 'Verified', 'Flagged', 'Rejected']

export function VerificationQueue() {
  const { submissions, setSubmissions } = useApp()
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setLoading(true)
    try {
      const data = await submissionsApi.list()
      setSubmissions(data)
    } catch (err: any) {
      toast.error(err.message || 'Cannot load submissions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleStatus = async (id: string, status: string) => {
    try {
      await submissionsApi.update(id, { status })
      setSubmissions(
        submissions.map((s) => (s.id === id ? { ...s, status: status as Submission['status'] } : s))
      )
      toast.success(`Record ${status.toLowerCase()}.`)
    } catch (err: any) {
      toast.error(err.message || 'Error updating.')
    }
  }

  const filtered = filter === 'All'
    ? submissions
    : submissions.filter((s) => s.status === filter)

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">Verification</div>
          <h1>Verification <em>queue.</em></h1>
          <p>Review and approve submissions before they enter the live database.</p>
        </div>
        <button onClick={loadAll} disabled={loading} className="button outline flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="filterBar">
        {filters.map((f) => (
          <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted text-xs font-mono">Loading submissions…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted text-xs font-mono">
          No {filter === 'All' ? '' : filter.toLowerCase()} submissions.
        </div>
      ) : (
        <div>
          {filtered.map((sub) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel queueCard"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="placePin"><i /></div>
                <div className="min-w-0">
                  <div className="queueTitle flex items-center gap-2 flex-wrap">
                    {sub.community}, {sub.district || sub.region}
                    {sub.property_type === 'Developed' && (
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] bg-flag-bg text-flag-text px-2 py-0.5 rounded">
                        Developed
                      </span>
                    )}
                  </div>
                  <div className="queueMeta">
                    {sub.land_size ? `${sub.land_size} ${sub.unit} · ` : ''}
                    {sub.land_use} · {sub.tenure_type} ·{' '}
                    <strong className="text-ink">{formatCurrency(sub.price)}</strong>
                    {sub.property_type === 'Developed' && (
                      <>
                        <br />
                        {sub.bedrooms && `${sub.bedrooms} bed`}
                        {sub.bathrooms && `, ${sub.bathrooms} bath`}
                        {sub.floor_area && `, ${sub.floor_area} sq.m`}
                        {sub.building_age && `, ${sub.building_age}yrs old`}
                        {sub.condition && `, ${sub.condition}`}
                      </>
                    )}
                    <br />
                    By <strong>{sub.surveyor_name}</strong> ({sub.licence_number})
                  </div>
                </div>
              </div>

              <div className="queuePrice text-right">
                <div className="recordSmall font-mono text-[9px] text-muted mb-1">Reported price</div>
                <div className="recordPrice text-[14px] font-semibold text-ink">
                  {formatCurrency(sub.price)}
                </div>
              </div>

              <div className="queueCell">
                <span className={`status ${sub.status}`}>{sub.status}</span>
                <span className="trustScore">
                  <i className={`dot ${sub.trust_score === 'High' ? 'green' : sub.trust_score === 'Medium' ? 'amber' : 'red'}`} />
                  {sub.trust_score} trust
                </span>
                <div className="queueActions">
                  {sub.status !== 'Verified' && (
                    <button onClick={() => handleStatus(sub.id, 'Verified')} className="button approve" title="Approve">
                      <Check size={13} /> Approve
                    </button>
                  )}
                  {sub.status === 'Pending' && (
                    <button onClick={() => handleStatus(sub.id, 'Flagged')} className="button flag" title="Flag for review">
                      <Flag size={13} /> Flag
                    </button>
                  )}
                  {sub.status !== 'Rejected' && sub.status !== 'Verified' && (
                    <button onClick={() => handleStatus(sub.id, 'Rejected')} className="button outline" title="Reject">
                      <X size={13} /> Reject
                    </button>
                  )}
                  {sub.status === 'Verified' && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-approve-text flex items-center gap-1.5">
                      <Check size={13} /> In database
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
