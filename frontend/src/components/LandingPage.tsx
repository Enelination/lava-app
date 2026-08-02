import { useEffect, useState } from 'react'
import { AuthModal } from './AuthModal'
import { useAuth } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const ctaWord = 'LAVA'

const features = [
  {
    title: 'Crowdsourced data',
    desc: 'Licensed GhIS surveyors submit land transaction data from anywhere in Ghana through a standardised portal.',
  },
  {
    title: 'Professional verification',
    desc: 'Every submission is reviewed by a trained vetting team before entering the live database.',
  },
  {
    title: 'AI-powered valuations',
    desc: 'LAVA reads verified records in real time and applies GhIS methodology to support professional land valuations.',
  },
]

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState(0)
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)

  const [ctaTick, setCtaTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCtaTick((t) => t + 1), 4000)
    return () => clearInterval(id)
  }, [])

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
      <div className="landingNav">
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
        <div className="flex items-center gap-2">
          <button className="button ghost" onClick={goExplore}>
            Explore demo
          </button>
          <button className="button" onClick={() => openAuth(1)}>
            Get started <span>→</span>
          </button>
        </div>
      </div>

      <section className="landingHero">
        <span className="eyebrow">
          <i /> Built for Ghana's valuation profession
        </span>
        <h1>
          Land intelligence
          <br />
          <em>you can trust.</em>
        </h1>
        <p>
          The first collaborative land transaction database for Ghana. Licensed surveyors contribute
          verified data, and LAVA's AI assistant applies GhIS methodology to support professional
          valuations in real time.
        </p>
        <div className="landingActions">
          <button className="button" onClick={() => openAuth(1)}>
            Get started <span>→</span>
          </button>
          <button className="button ghost" onClick={goExplore}>
            Explore demo
          </button>
        </div>
        <div className="trustBar">
          <span><b>GhIS</b> Standards</span>
          <span><b>10</b> Regions covered</span>
          <span><b>5</b> Legislative sources</span>
          <span><b>100%</b> Verified pipeline</span>
        </div>
      </section>

      <section className="landingFeatures">
        <h2>Built on a simple principle — verified data makes better valuations.</h2>
        <div className="featureGrid">
          {features.map((f, i) => (
            <div className="feature" key={i}>
              <div className="featureIndex">0{i + 1}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landingCta">
        <span className="eyebrow">
          <i /> Clarity found?
        </span>
        <h2>
          Just ask{' '}
          <em className="ctaWord">
            <span key={ctaTick} className="ctaWordInner">
              {ctaWord}.
            </span>
          </em>
        </h2>
        <button className="button" onClick={() => openAuth(0)}>
          Start a conversation <span>→</span>
        </button>
      </section>

      <footer className="landingFooter">
        <span>LAVA © 2026</span>
        <span>Built for the Ghana Institution of Surveyors</span>
        <span>GhIS thesis project by Louisa Hans-Jorie</span>
      </footer>

      {showAuth && <AuthModal initialTab={authTab} onClose={() => setShowAuth(false)} />}
    </div>
  )
}
