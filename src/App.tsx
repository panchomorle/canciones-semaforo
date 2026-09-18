import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AdminLogin } from './components/AdminLogin'
import { AdminDashboard } from './components/AdminDashboard'
import { GuestView } from './components/GuestView'

export function App() {
  const [session, setSession] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'guest' | 'login' | 'admin'>(() => 
    typeof window !== 'undefined' && window.location.hash === '#admin' ? 'login' : 'guest'
  )

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session && window.location.hash === '#admin') {
        setView('admin')
      }
      setLoading(false)
    })

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setView('admin')
      } else {
        setView((prev) => (prev === 'admin' ? 'guest' : prev))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setView('guest')
    window.location.hash = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Admin Dashboard View
  if (view === 'admin' && session) {
    return (
      <AdminDashboard
        onLogout={handleLogout}
        onSwitchToGuest={() => setView('guest')}
      />
    )
  }

  // Admin Login View
  if (view === 'login') {
    return (
      <AdminLogin
        onLoginSuccess={() => setView('admin')}
        onCancel={() => {
          setView('guest')
          window.location.hash = ''
        }}
      />
    )
  }

  // Guest SPA View
  return (
    <GuestView
      onNavigateToAdmin={() => {
        if (session) {
          setView('admin')
        } else {
          setView('login')
          window.location.hash = 'admin'
        }
      }}
      isAdminSession={Boolean(session)}
    />
  )
}

export default App
