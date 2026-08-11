import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Search } from 'lucide-react'
import { submissions as submissionsApi } from '../lib/api'
import { useApp } from '../store/appStore'
import { useAuth } from '../store/authStore'
import { formatCurrency, formatDate } from '../lib/utils'

const PER_PAGE = 10
const GUEST_LIMIT = 3

const inputCls =
  'w-full border border-line rounded-sm2 bg-paper px-3 py-2.5 text-xs text-ink outline-none focus:border-muted transition-colors placeholder:text-[#b0bcc3]'

export function Dashboard() {
  const { user, openAuth } = useAuth()
  const isGuest = !user
  const { stats, setStats, submissions, setSubmissions, setActivePage } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsData, subsData] = await Promise.all([
        submissionsApi.stats(),
        submissionsApi.list(),
      ])
      setStats(statsData)
      setSubmissions(subsData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const verified = submissions.filter((s) => s.status === 'Verified')
    const list = q
      ? verified.filter((s) =>
          [s.community, s.district, s.region, s.land_use, s.tenure_type, s.surveyor_name, s.licence_number]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : verified
    return list.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
  }, [submissions, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
  const shownItems = isGuest ? pageItems.slice(0, GUEST_LIMIT) : pageItems

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">LAVA Workspace</div>
          <h1>Good day, <em>{user ? user.name.split(' ')[0] : 'welcome back.'}</em></h1>
          <p>Live overview of the LAVA land transaction database.</p>
        </div>
        <button onClick={loadData} disabled={loading} className="button outline flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="statusNote bad mb-6" style={{ maxWidth: 'none' }}>
          {error}. Please check your backend connection in Settings.
        </div>
      )}

      <div className="metrics">
        <div className="panel metric">
          <div className="metricValue">
            {loading ? '—' : stats?.verified ?? 0}
          </div>
          <div className="metricLabel">Verified records</div>
        </div>
        <div className="panel metric">
          <div className="metricValue">
            {loading ? '—' : stats?.pending ?? 0}
          </div>
          <div className="metricLabel">Awaiting review</div>
          <div className="font-mono text-[10px] text-muted flex items-center gap-2">
            <span className="dot green" /> Live from database
          </div>
        </div>
        <div className="panel metric">
          <div className="metricValue">
            {loading ? '—' : stats?.regions ?? 0}
          </div>
          <div className="metricLabel">Regions covered</div>
          <div className="font-mono text-[10px] text-muted">Growing network</div>
        </div>
      </div>

      {isGuest && (
        <div className="guestBanner">
          <div className="guestBannerText">
            <div className="guestBannerTitle">You're viewing a preview of the LAVA database.</div>
            <p>
              Sign in to see all {filtered.length} records with full details, plus the complete
              workspace.
            </p>
          </div>
          <div className="guestBannerActions">
            <button className="button" onClick={() => openAuth(0)}>
              Sign in
            </button>
            <button className="button outline" onClick={() => openAuth(1)}>
              Create account
            </button>
          </div>
        </div>
      )}

      <div className="contentGrid mt-[18px]">
        <section className="panel">
          <div className="panelHead">
            <div>
              <h3>Records</h3>
              <p>
                {isGuest
                  ? `Showing ${Math.min(GUEST_LIMIT, filtered.length)} of ${filtered.length} records — sign in to see the rest.`
                  : filtered.length === 1
                    ? '1 record submitted to the database.'
                    : `${filtered.length} records submitted to the database.`}
              </p>
            </div>
            {!isGuest && (
              <div className="relative w-full max-w-[220px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search records…"
                  className={`${inputCls} pl-8`}
                />
              </div>
            )}
          </div>
          <div className="records">
            <div className="recordHeader">
              <span>Place</span>
              <span>Land use</span>
              <span>Price (GHS)</span>
              <span>Trust</span>
              <span>Verified</span>
            </div>
            {loading ? (
              <div className="record">
                <span className="recordSmall">Loading records…</span>
              </div>
            ) : shownItems.length === 0 ? (
              <div className="record">
                <span className="recordSmall">
                  {query.trim() ? 'No records match your search.' : 'No records yet.'}
                </span>
              </div>
            ) : (
              shownItems.map((r) => (
                <div className="record" key={r.id}>
                  <span>
                    {r.community}
                    <div className="recordSmall">{r.district || r.region}</div>
                  </span>
                  <span>{r.land_use || '—'}</span>
                  <span className="recordPrice">{formatCurrency(r.price)}</span>
                  <span className="trustScore">
                    <i
                      className={`dot ${
                        r.trust_score === 'High' ? 'green' : r.trust_score === 'Medium' ? 'amber' : 'red'
                      }`}
                    />
                    {r.trust_score || '—'}
                  </span>
                  <span className="recordSmall">{formatDate(r.verified_at || r.submitted_at)}</span>
                </div>
              ))
            )}
          </div>
          {!isGuest && filtered.length > PER_PAGE && (
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-line flex-wrap">
              <span className="font-mono text-[11px] text-muted">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="button outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ← Prev
                </button>
                <button
                  className="button outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="insight">
          <div className="tinyMark">L</div>
          <h3>
            AI valuation <em>assistant</em> ready.
          </h3>
          <p>
            Ask about land values, comparables, stamp duty or methodology. Grounded in verified
            records and GhIS standards.
          </p>
          <button className="button dark" onClick={() => setActivePage('ai')}>
            Open assistant →
          </button>
        </aside>
      </div>
    </div>
  )
}
