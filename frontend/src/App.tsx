import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/authStore'
import { LandingPage } from './components/LandingPage'
import { AppLayout } from './components/AppLayout'

export default function App() {
  const { user, initialized, init } = useAuth()

  useEffect(() => {
    init()
  }, [init])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="LAVA" className="logoImg" style={{ width: 44, height: 44 }} />
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/app" replace /> : <LandingPage />}
      />
      <Route path="/app/*" element={<AppLayout />} />
    </Routes>
  )
}
