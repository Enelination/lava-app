import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { settings as settingsApi } from '../lib/api'

export function Settings() {
  const [claudeKey, setClaudeKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await settingsApi.get()
      setClaudeKey(data.claude_api_key || '')
      setConfigured(!!data.claude_api_key)
    } catch {
      setConfigured(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.update({ claude_api_key: claudeKey })
      setConfigured(!!claudeKey)
      toast.success('Settings saved. LAVA is active.')
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-line rounded-sm2 bg-paper px-3 py-2.5 text-xs text-ink outline-none focus:border-muted transition-colors placeholder:text-[#b0bcc3]'

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">Configuration</div>
          <h1>Settings.</h1>
          <p>Configure API connections. Admin only.</p>
        </div>
      </div>

      <div className="panel settingsCard" style={{ maxWidth: 640 }}>
        <div className="settingsHead">
          <div className="settingsHeadIcon">🔒</div>
          <div>
            <h2>Secure integrations</h2>
            <p>Credentials stay in your configured environment and are never bundled in this project.</p>
          </div>
        </div>

        <div className="settingsBody">
          {!loading && (
            <div className={`statusNote ${configured ? 'good' : 'bad'}`}>
              <i className={`dot ${configured ? 'green' : 'red'}`} style={{ width: 6, height: 6, borderRadius: '50%' }} />
              {configured
                ? 'Claude API key configured — LAVA is active'
                : 'No Claude API key — add it below to activate LAVA'}
            </div>
          )}

          <div className="field" style={{ marginBottom: 20 }}>
            <label>AI API key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="sk-ant-api03-…"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted hover:text-ink cursor-pointer"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="button dark">
            <Save size={14} />
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>

      <div className="panel settingsCard mt-[18px]" style={{ maxWidth: 640 }}>
        <div className="settingsHead">
          <div className="settingsHeadIcon">ℹ️</div>
          <div>
            <h2>About LAVA</h2>
            <p>Land Valuation Assistant</p>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-muted">
          LAVA is a prototype collaborative land data platform developed as a GhIS qualification thesis
          project by Louisa Hans-Jorie. Built on GhIS valuation standards, Ghana Land Act 2020 (Act 1036),
          Stamp Duty Act (Act 689), and Market Comparison Analysis methodology.
        </p>
      </div>
    </div>
  )
}
