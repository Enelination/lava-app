import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from './Navbar'
import { useAuth } from '../store/authStore'
import { useApp } from '../store/appStore'
import { Dashboard } from './Dashboard'
import { AIAssistant } from './AIAssistant'
import { SubmitData } from './SubmitData'
import { VerificationQueue } from './VerificationQueue'
import { KnowledgeBase } from './KnowledgeBase'
import { Settings } from './Settings'
import { Profile } from './Profile'
import { getInitials } from '../lib/utils'

const pages: Record<string, React.FC> = {
  home: Dashboard,
  ai: AIAssistant,
  sub: SubmitData,
  ver: VerificationQueue,
  kb: KnowledgeBase,
  cfg: Settings,
  acct: Profile,
}

const pageNames: Record<string, string> = {
  home: 'Overview',
  ai: 'LAVA Assistant',
  sub: 'Submit Data',
  ver: 'Verification Queue',
  kb: 'Knowledge Base',
  cfg: 'Settings',
  acct: 'Account',
}

export function AppLayout() {
  const { user } = useAuth()
  const { activePage, setActivePage, navCollapsed } = useApp()

  useEffect(() => {
    if (!user) {
      setActivePage('home')
    }
  }, [user, setActivePage])

  const PageComponent = pages[activePage] || Dashboard

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <div className={`mainArea max-lg:pt-16 ${navCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[246px]'}`}>
        <header className="topbar max-lg:hidden">
          <div className="topbarCrumb">
            LAVA <span className="mx-1.5 opacity-50">/</span> <b>{pageNames[activePage] || 'Overview'}</b>
          </div>
          <div className="topbarUser">
            <div className="hidden sm:block text-right">
              <div className="text-[11px] font-semibold text-ink leading-tight">
                {user?.name?.split(' ')[0] || 'Guest'}
              </div>
              <div className="font-mono text-[9px] text-muted">{user?.licence_number || ''}</div>
            </div>
            <button
              onClick={() => setActivePage('acct')}
              title="Account settings"
              className="bg-transparent border-none cursor-pointer p-0"
            >
              <div className="avatar" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 10 }}>
                {getInitials(user?.name || 'User')}
              </div>
            </button>
          </div>
        </header>
        <main className="page">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
