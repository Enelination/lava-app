import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../store/authStore'

interface Props {
  initialTab: number
  onClose: () => void
}

export function AuthModal({ initialTab, onClose }: Props) {
  const [tab, setTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const { login, loginByLicence, register } = useAuth()

  const [loginInput, setLoginInput] = useState('')
  const [loginPw, setLoginPw] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPw, setRegPw] = useState('')
  const [regLicence, setRegLicence] = useState('')
  const [regOrg, setRegOrg] = useState('')

  const handleLogin = async () => {
    setError('')
    if (!loginInput || !loginPw) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const isEmail = loginInput.includes('@')
      if (isEmail) await login(loginInput, loginPw)
      else await loginByLicence(loginInput, loginPw)
      toast.success('Welcome back!')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setError('')
    if (!regName || !regEmail || !regPw) {
      setError('Please fill in all required fields.')
      return
    }
    if (regPw.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPw,
        licence_number: regLicence || undefined,
        organisation: regOrg || undefined,
      })
      toast.success('Welcome to LAVA!')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t: number) => {
    setTab(t)
    setError('')
  }

  const inputCls = 'w-full border border-line rounded-sm2 bg-paper px-3 py-2.5 text-xs text-ink outline-none focus:border-muted transition-colors placeholder:text-[#b0bcc3]'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modalWrap"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="authModal"
      >
        <button onClick={onClose} className="authClose" aria-label="Close">
          <X size={16} />
        </button>

        <h2>{tab === 0 ? 'Welcome back.' : 'Create your account'}</h2>
        <p>
          {tab === 0
            ? 'Sign in to continue to LAVA.'
            : 'Start contributing verified land data.'}
        </p>

        <div className="authTabs">
          <button className={tab === 0 ? 'active' : ''} onClick={() => switchTab(0)}>
            Sign in
          </button>
          <button className={tab === 1 ? 'active' : ''} onClick={() => switchTab(1)}>
            Register
          </button>
        </div>

        {error && <div className="authError">{error}</div>}

        {tab === 0 ? (
          <div className="space-y-4">
            <div className="field">
              <label>Email or GhIS Licence Number</label>
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="your@email.com"
                className={inputCls}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="Your password"
                  className={`${inputCls} pr-10`}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted hover:text-ink cursor-pointer"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button onClick={handleLogin} disabled={loading} className="button dark block">
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
            <p className="authNote">
              No account?{' '}
              <button onClick={() => switchTab(1)}>Register free</button>
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="field">
              <label>Full name *</label>
              <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your full name" className={inputCls} />
            </div>
            <div className="field">
              <label>Email *</label>
              <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="your@email.com" className={inputCls} />
            </div>
            <div className="field">
              <label>Password * (min 6 characters)</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={regPw} onChange={(e) => setRegPw(e.target.value)} placeholder="Choose a password" className={`${inputCls} pr-10`} />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted hover:text-ink cursor-pointer"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="field">
              <label>GhIS Licence Number</label>
              <input type="text" value={regLicence} onChange={(e) => setRegLicence(e.target.value)} placeholder="e.g. GhIS/VS/0042" className={inputCls} />
              <span className="block text-[11px] text-muted mt-1.5">Leave blank if you are a student or researcher. Required only to submit data.</span>
            </div>
            <div className="field">
              <label>Organisation / Institution</label>
              <input type="text" value={regOrg} onChange={(e) => setRegOrg(e.target.value)} placeholder="Your firm, university or institution" className={inputCls} />
            </div>
            <button onClick={handleRegister} disabled={loading} className="button dark block">
              {loading ? 'Creating account…' : 'Create free account →'}
            </button>
            <p className="authNote">
              Already registered?{' '}
              <button onClick={() => switchTab(0)}>Sign in</button>
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
