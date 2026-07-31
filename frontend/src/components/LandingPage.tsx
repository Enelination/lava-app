import { useState } from 'react'
import { motion } from 'framer-motion'
import { AuthModal } from './AuthModal'
import { useAuth } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const features = [
  {
    index: '01',
    title: 'Crowdsourced data',
    desc: 'Licensed GhIS surveyors submit land transaction data from anywhere in Ghana through a standardised portal.',
  },
  {
    index: '02',
    title: 'Professional verification',
    desc: 'Every submission is reviewed by a trained vetting team before entering the live database.',
  },
  {
    index: '03',
    title: 'AI-powered valuations',
    desc: 'LAVA reads verified records in real time and applies GhIS methodology to support professional land valuations.',
  },
]

const stats = [
  { value: 'GhIS', label: 'Standards' },
  { value: '10', label: 'Regions covered' },
  { value: '5', label: 'Legislative sources' },
  { value: '100%', label: 'Verified pipeline' },
]

const maskV = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}

const lineV = {
  hidden: { y: '118%' },
  visible: { y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState(0)
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)

  const goExplore = () => navigate('/app')

  const openAuth = (tab: number) => {
    if (user) {
      goExplore()
      return
    }
    setAuthTab(tab)
    setShowAuth(true)
  }

  return (
    <div className="landing">
      <nav className="landingNav">
        <button
          onClick={goExplore}
          className="flex items-center gap-3 bg-transparent border-none cursor-pointer"
        >
          <span className="logoMark">L</span>
          <span className="text-left">
            <span className="logoWord">LAVA</span>
            <div className="logoSub">Land Valuation Assistant Ghana</div>
          </span>
        </button>
        <div className="landingNavLinks">
          <button onClick={goExplore}>Overview</button>
          <button onClick={goExplore}>Assistant</button>
          <button onClick={() => openAuth(1)}>Sign in</button>
        </div>
        <button className="landingLink navCta" onClick={() => openAuth(1)}>
          Get started <span>→</span>
        </button>
      </nav>

      <section className="landingHero">
        <motion.span
          className="eyebrow"
          initial="hidden"
          animate="visible"
          variants={maskV}
        >
          <i /> Built for Ghana's valuation profession
        </motion.span>

        <h1>
          <motion.span
            className="heroLineMask"
            initial="hidden"
            animate="visible"
            variants={maskV}
          >
            <motion.span className="heroLine" variants={lineV}>
              Land intelligence
            </motion.span>
          </motion.span>
          <motion.span
            className="heroLineMask"
            initial="hidden"
            animate="visible"
            variants={maskV}
          >
            <motion.span className="heroLine" variants={lineV}>
              <em>you can trust.</em>
            </motion.span>
          </motion.span>
        </h1>

        <motion.p variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.55 }}>
          The first collaborative land transaction database for Ghana. Licensed surveyors contribute
          verified data, and LAVA's AI assistant applies GhIS methodology to support professional
          valuations in real time.
        </motion.p>

        <motion.div
          className="landingActions"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
        >
          <button className="landingLink" onClick={() => openAuth(1)}>
            Get started <span>→</span>
          </button>
          <button className="landingLink" onClick={goExplore}>
            Explore the demo <span>→</span>
          </button>
        </motion.div>

        <motion.div
          className="trustBar"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.85 }}
        >
          {stats.map((s) => (
            <span key={s.label}>
              <b>{s.value}</b> {s.label}
            </span>
          ))}
        </motion.div>
      </section>

      <section className="landingFeatures">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          Built on a simple principle — verified data makes better valuations.
        </motion.h2>
        <div className="featureGrid">
          {features.map((f, i) => (
            <motion.div
              className="feature"
              key={f.index}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: 0.12 + i * 0.1 }}
            >
              <div className="featureIndex">{f.index}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="featureArrow" aria-hidden>→</span>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="landingFooter">
        <div className="landingFooterCta">
          <motion.p
            className="eyebrow"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <i /> Clarity found?
          </motion.p>
          <motion.div
            variants={maskV}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <h2>
              <span className="heroLineMask">
                <motion.span className="heroLine" variants={lineV}>
                  Just ask <em>LAVA.</em>
                </motion.span>
              </span>
            </h2>
          </motion.div>
          <motion.button
            className="landingLink big"
            onClick={() => openAuth(0)}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            Start a conversation <span>→</span>
          </motion.button>
        </div>
        <div className="landingFooterBar">
          <span>LAVA © 2026</span>
          <span>Built for the Ghana Institution of Surveyors</span>
          <span>GhIS thesis project by Louisa Hans-Jorie</span>
        </div>
      </footer>

      {showAuth && <AuthModal initialTab={authTab} onClose={() => setShowAuth(false)} />}
    </div>
  )
}
