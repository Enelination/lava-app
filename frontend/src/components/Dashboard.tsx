import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { submissions as submissionsApi } from '../lib/api'
import { useApp } from '../store/appStore'
import { formatCurrency, formatDate } from '../lib/utils'

export function Dashboard() {
  const { stats, setStats, submissions, setSubmissions, setActivePage } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const recent = submissions.slice(0, 6)

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">LAVA Workspace</div>
          <h1>Good day, <em>{'welcome back.'}</em></h1>
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
          <div className="font-mono text-[9px] text-muted flex items-center gap-2">
            <span className="dot green" /> Live from database
          </div>
        </div>
        <div className="panel metric">
          <div className="metricValue">
            {loading ? '—' : stats?.regions ?? 0}
          </div>
          <div className="metricLabel">Regions covered</div>
          <div className="font-mono text-[9px] text-muted">Growing network</div>
        </div>
      </div>

      <div className="contentGrid mt-[18px]">
        <section className="panel">
          <div className="panelHead">
            <div>
              <h3>Recent records</h3>
              <p>Latest verified submissions from the database.</p>
            </div>
          </div>
          <div className="records">
            <div className="recordHeader">
              <span>Place</span>
              <span>Land use</span>
              <span>Price (GHS)</span>
              <span>Verified</span>
            </div>
            {loading ? (
              <div className="record">
                <span className="recordSmall">Loading records…</span>
              </div>
            ) : recent.length === 0 ? (
              <div className="record">
                <span className="recordSmall">No records yet.</span>
              </div>
            ) : (
              recent.map((r) => (
                <div className="record" key={r.id}>
                  <span>
                    {r.community}
                    <div className="recordSmall">{r.district || r.region}</div>
                  </span>
                  <span>{r.land_use || '—'}</span>
                  <span className="recordPrice">{formatCurrency(r.price)}</span>
                  <span className="recordSmall">{formatDate(r.submitted_at)}</span>
                </div>
              ))
            )}
          </div>
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
