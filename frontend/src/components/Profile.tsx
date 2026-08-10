import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save, KeyRound, User as UserIcon, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../store/authStore'
import { auth as authApi } from '../lib/api'
import { getRoleLabel } from '../lib/utils'
import { AuthModal } from './AuthModal'

export function Profile() {
  const { user, setUser } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [licence, setLicence] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [changing, setChanging] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setLicence(user.licence_number || '')
      setOrganisation(user.organisation || '')
    }
  }, [user])

  if (!user) {
    return (
      <div>
        <div className="pageHead">
          <div className="welcome">
            <div className="crumb">Account</div>
            <h1>Profile.</h1>
            <p>Sign in to manage your personal details and security.</p>
          </div>
        </div>

        <div className="panel settingsCard" style={{ maxWidth: 640 }}>
          <div className="settingsHead">
            <div className="settingsHeadIcon"><Lock size={17} /></div>
            <div>
              <h2>Guest explorer</h2>
              <p>You're browsing LAVA without an account.</p>
            </div>
          </div>
          <div className="settingsBody">
            <p className="text-muted mb-4">
              Profile updates and password changes are only available to signed-in users.
            </p>
            <button className="button dark" onClick={() => setShowAuth(true)}>
              Sign in to your account
            </button>
          </div>
        </div>

        {showAuth && <AuthModal initialTab={1} onClose={() => setShowAuth(false)} />}
      </div>
    )
  }

  const inputCls = 'w-full border border-line rounded-sm2 bg-paper px-3 py-2.5 text-xs text-ink outline-none focus:border-muted transition-colors placeholder:text-[#b0bcc3]'

  const handleSave = async () => {
    if (!user) return
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required.')
      return
    }
    setSaving(true)
    try {
      const { user: updated } = await authApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
        licence_number: licence.trim() || null,
        organisation: organisation.trim() || null,
      })
      setUser(updated)
      toast.success('Profile updated.')
    } catch (err: any) {
      toast.error(err.message || 'Error updating profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Fill in all password fields.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    setChanging(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed.')
    } catch (err: any) {
      toast.error(err.message || 'Error changing password.')
    } finally {
      setChanging(false)
    }
  }

  return (
    <div>
      <div className="pageHead">
        <div className="welcome">
          <div className="crumb">Account</div>
          <h1>Profile.</h1>
          <p>Edit your personal details and security.</p>
        </div>
      </div>

      <div className="panel settingsCard" style={{ maxWidth: 640 }}>
        <div className="settingsHead">
          <div className="settingsHeadIcon"><UserIcon size={17} /></div>
          <div>
            <h2>Personal details</h2>
            <p>
              {user ? `${getRoleLabel(user.role)} · ${user.email}` : ''}
            </p>
          </div>
        </div>

        <div className="settingsBody">
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className={inputCls}
            />
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label>Licence number</label>
            <input
              type="text"
              value={licence}
              onChange={(e) => setLicence(e.target.value)}
              placeholder="GhIS/VS/0000"
              className={inputCls}
            />
            {user?.role === 'public' && (
              <p className="text-[12px] text-muted mt-1.5">Adding a licence number upgrades your account to Surveyor.</p>
            )}
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label>Organisation</label>
            <input
              type="text"
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              placeholder="Company / practice name (optional)"
              className={inputCls}
            />
          </div>

          <button onClick={handleSave} disabled={saving} className="button dark">
            <Save size={14} />
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>

      <div className="panel settingsCard mt-[18px]" style={{ maxWidth: 640 }}>
        <div className="settingsHead">
          <div className="settingsHeadIcon"><KeyRound size={17} /></div>
          <div>
            <h2>Change password</h2>
            <p>Use a password you haven't used before.</p>
          </div>
        </div>

        <div className="settingsBody">
          <div className="field" style={{ marginBottom: 20 }}>
            <label>Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
              autoComplete="current-password"
            />
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label>New password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={`${inputCls} pr-10`}
                autoComplete="new-password"
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

          <div className="field" style={{ marginBottom: 20 }}>
            <label>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={inputCls}
              autoComplete="new-password"
            />
          </div>

          <button onClick={handleChangePassword} disabled={changing} className="button dark">
            <KeyRound size={14} />
            {changing ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  )
}
