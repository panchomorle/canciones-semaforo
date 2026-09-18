import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AdminLogin } from './components/AdminLogin'
import { AdminDashboard } from './components/AdminDashboard'
import { Shield, Music, Sparkles } from 'lucide-react'

export function App() {
  const [session, setSession] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'guest' | 'login' | 'admin'>('guest')

  useEffect(() => {
    // Check hash on load
    if (window.location.hash === '#admin') {
      setView('login')
    }

    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
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
      } else if (view === 'admin') {
        setView('guest')
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

  // Guest Landing View (Will be expanded in Issue #3)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20">
              CS
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Canciones Semáforo</h1>
              <p className="text-[11px] text-slate-400">Elegí una canción y dedicala</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <button
                onClick={() => setView('admin')}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Ir al Panel Admin</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setView('login')
                  window.location.hash = 'admin'
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Placeholder preview */}
      <main className="max-w-3xl mx-auto px-6 py-16 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Panel de administración listo</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          ¡El admin panel y autenticación ya están operativos!
        </h2>
        <p className="mt-4 text-slate-400 text-base max-w-xl">
          Podés ingresar como administrador haciendo click arriba a la derecha en <strong className="text-slate-200">Admin</strong> para gestionar las canciones en vivo y marcar cuáles ya fueron tocadas.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setView('login')
              window.location.hash = 'admin'
            }}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Ingresar como Administrador</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <Music className="w-3.5 h-3.5 text-amber-500" />
          <span>Canciones Semáforo — Evento en vivo</span>
        </div>
      </footer>
    </div>
  )
}

export default App
