import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../store/authStore'
import { useApp } from '../store/appStore'
import { useNavigate } from 'react-router-dom'
import { getInitials, getRoleLabel, hasRole } from '../lib/utils'
import { LogOut, X } from 'lucide-react'

const tabs = [
  { id: 'home', label: 'Overview', icon: '⌂', minRole: 'public' },
  { id: 'ai', label: 'LAVA Assistant', icon: '✦', minRole: 'public' },
  { id: 'sub', label: 'Submit Data', icon: '＋', minRole: 'surveyor' },
  { id: 'ver', label: 'Verify', icon: '✓', minRole: 'officer' },
  { id: 'kb', label: 'Knowledge Base', icon: '▤', minRole: 'admin' },
  { id: 'cfg', label: 'Settings', icon: '⚙', minRole: 'admin' },
]

export function Navbar() {
  const { user, logout } = useAuth()
  const { activePage, setActivePage } = useApp()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const userRole = user?.role || 'public'
  const visibleTabs = tabs.filter((t) => hasRole(userRole, t.minRole))

  const go = (id: string) => {
    setActivePage(id)
    setMobileOpen(false)
  }

  return (
    <>
      <aside className="sidebar hidden lg:flex">
        <button
          onClick={() => go('home')}
          className="logoBox flex items-center gap-3 bg-transparent border-none cursor-pointer px-2 pb-6"
        >
          <span className="logoMark">L</span>
          <span className="text-left">
            <span className="logoWord">LAVA</span>
            <div className="logoSub">Valuation Assistant</div>
          </span>
        </button>

        <div className="workspace">Workspace</div>
        <nav className="navList">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => go(tab.id)}
              className={`navItem ${activePage === tab.id ? 'active' : ''}`}
            >
              <span className="navIcon">{tab.icon}</span>
              <span className="navLabel">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="support">
          <div className="avatar">{getInitials(user?.name || 'User')}</div>
          <div className="supportText min-w-0">
            <div className="supportName">{user?.name?.split(' ')[0] || 'Guest'}</div>
            <div className="supportRole">{getRoleLabel(userRole)}</div>
          </div>
          {user && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="ml-auto bg-transparent border-none text-white/30 hover:text-white cursor-pointer transition-colors"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-deep text-white px-4 h-16 flex items-center justify-between">
        <button onClick={() => go('home')} className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer">
          <span className="logoMark" style={{ width: 30, height: 30, fontSize: 15 }}>L</span>
          <span className="logoWord" style={{ fontSize: 11 }}>LAVA</span>
        </button>
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={handleLogout} className="bg-transparent border-none text-white/40 hover:text-white cursor-pointer">
              <LogOut size={17} />
            </button>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="bg-transparent border-none text-white/80 cursor-pointer p-1">
            {mobileOpen ? <X size={20} /> : <span className="block space-y-1.5"><span className="block w-5 h-0.5 bg-white/70 rounded" /><span className="block w-5 h-0.5 bg-white/70 rounded" /><span className="block w-3.5 h-0.5 bg-white/70 rounded" /></span>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="lg:hidden fixed top-16 inset-x-0 z-40 bg-deep border-b border-white/10 px-4 pb-4"
          >
            <div className="navList mt-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => go(tab.id)}
                  className={`navItem ${activePage === tab.id ? 'active' : ''}`}
                >
                  <span className="navIcon">{tab.icon}</span>
                  <span className="navLabel">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
