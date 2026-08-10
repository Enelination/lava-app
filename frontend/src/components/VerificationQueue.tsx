import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Check, Flag, X, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { submissions as submissionsApi } from '../lib/api'
import { useApp } from '../store/appStore'
import { useAuth } from '../store/authStore'
import { formatCurrency } from '../lib/utils'
import type { Submission } from '../types'

const filters = ['All', 'Pending', 'Verified', 'Flagged', 'Rejected']

export function VerificationQueue() {
  const { user } = useAuth()
  const { submissions, setSubmissions } = useApp()
  const isAdmin = user?.role === 'admin'
  const [filter, setFilter] = useState('All')
  const [region, setRegion] = useState('All')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const locationFor = (s: Submission) =>
    [s.community, s.district].filter(Boolean).join(', ') || s.region

  const confirmDelete = async (record: Submission) => {
    setDeleting(true)
    try {
      await submissionsApi.delete(record.id)
      setSubmissions(submissions.filter((s) => s.id !== record.id))
      toast.success('Submission deleted.')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.message || 'Error deleting submission.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!deleteTarget) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteTarget(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteTarget])

  const regions = useMemo(
    () =>
      Array.from(new Set(submissions.map((s) => s.region).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [submissions]
  )

  const filtered = useMemo(() => {
    let list = submissions
    if (filter !== 'All') list = list.filter((s) => s.status === filter)
    if (region !== 'All') list = list.filter((s) => s.region === region)

    const min = parseFloat(minPrice)
    const max = parseFloat(maxPrice)
    if (!isNaN(min)) list = list.filter((s) => s.price >= min)
    if (!isNaN(max)) list = list.filter((s) => s.price <= max)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((s) =>
        [s.community, s.district, s.region, s.surveyor_name, s.licence_number]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }

    const sorted = [...list]
    switch (sortBy) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
        break
      case 'priceDesc':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'priceAsc':
        sorted.sort((a, b) => a.price - b.price)
        break
      default:
        sorted.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    }
    return sorted
  }, [submissions, filter, region, minPrice, maxPrice, search, sortBy])

  const hasExtraFilters = region !== 'All' || minPrice !== '' || maxPrice !== '' || search.trim() !== ''

  const clearFilters = () => {
    setRegion('All')
    setMinPrice('')
    setMaxPrice('')
    setSearch('')
    setSortBy('newest')
  }

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

      <div className="queueToolbar">
        <label className="field">
          <span>Search</span>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Place or surveyor…"
              className="pl-8"
            />
          </div>
        </label>
        <label className="field">
          <span>Region</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="All">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Min price</span>
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="GHS 0"
          />
        </label>
        <label className="field">
          <span>Max price</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="No max"
          />
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priceDesc">Highest price</option>
            <option value="priceAsc">Lowest price</option>
          </select>
        </label>
        {hasExtraFilters && (
          <button className="button outline" onClick={clearFilters}>
            Clear
          </button>
        )}
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
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] bg-flag-bg text-flag-text px-2 py-0.5 rounded">
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
                <div className="recordSmall font-mono text-[10px] text-muted mb-1">Reported price</div>
                <div className="recordPrice text-[15px] font-semibold text-ink">
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
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-approve-text flex items-center gap-1.5">
                      <Check size={13} /> In database
                    </span>
                  )}
                  {isAdmin && (
                    <button onClick={() => setDeleteTarget(sub)} className="button delete" title="Delete permanently">
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modalWrap"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="confirmModal"
            >
              <button onClick={() => setDeleteTarget(null)} className="authClose" aria-label="Close">
                <X size={16} />
              </button>
              <div className="confirmIcon">
                <Trash2 size={20} />
              </div>
              <h3>Delete this submission?</h3>
              <p>
                This will permanently delete the submission for{' '}
                <strong>{locationFor(deleteTarget)}</strong> (
                <strong>{formatCurrency(deleteTarget.price)}</strong>). This action cannot be
                undone.
              </p>
              <div className="confirmActions">
                <button className="button outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </button>
                <button className="button delete" onClick={() => confirmDelete(deleteTarget)} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
