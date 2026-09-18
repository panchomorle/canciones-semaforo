import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Song, Dedication } from '../types/database'
import { 
  Music, 
  Plus, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  LogOut, 
  Heart, 
  Radio, 
  Eye, 
  Loader2,
  AlertCircle,
  ChevronDown
} from 'lucide-react'

interface AdminDashboardProps {
  onLogout: () => void
  onSwitchToGuest: () => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onSwitchToGuest }) => {
  const [songs, setSongs] = useState<Song[]>([])
  const [dedications, setDedications] = useState<Dedication[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newArtist, setNewArtist] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'songs' | 'dedications'>('songs')
  const [expandedSongIds, setExpandedSongIds] = useState<Set<string>>(new Set())

  const toggleSongExpanded = (songId: string) => {
    setExpandedSongIds((prev) => {
      const next = new Set(prev)
      if (next.has(songId)) {
        next.delete(songId)
      } else {
        next.add(songId)
      }
      return next
    })
  }

  // Load initial data
  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch songs
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: true })

      if (songsError) throw songsError
      setSongs(songsData || [])

      // 2. Fetch all dedications (admin has RLS select access)
      const { data: dedicationsData, error: dedicationsError } = await supabase
        .from('dedications')
        .select(`
          id,
          song_id,
          recipient_name,
          sender_name,
          created_at,
          songs:song_id (
            id,
            title,
            artist
          )
        `)
        .order('created_at', { ascending: false })

      if (dedicationsError) throw dedicationsError
      setDedications((dedicationsData as unknown as Dedication[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos'
      setErrorMessage(msg)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Realtime subscriptions
    const channel = supabase
      .channel('admin_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        () => {
          // Refetch songs on any change
          supabase
            .from('songs')
            .select('*')
            .order('created_at', { ascending: true })
            .then(({ data }) => {
              if (data) setSongs(data)
            })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dedications' },
        (payload) => {
          // When a new dedication arrives, fetch its associated song and prepend
          const newDedication = payload.new as Dedication
          supabase
            .from('songs')
            .select('*')
            .eq('id', newDedication.song_id)
            .single()
            .then(({ data: songData }) => {
              const fullDedication: Dedication = {
                ...newDedication,
                songs: songData || undefined
              }
              setDedications((prev) => [fullDedication, ...prev])
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Toggle played status
  const handleTogglePlayed = async (song: Song) => {
    try {
      const { error } = await supabase
        .from('songs')
        .update({ is_played: !song.is_played })
        .eq('id', song.id)

      if (error) throw error

      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, is_played: !song.is_played } : s))
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar canción'
      alert(msg)
    }
  }

  // Delete song
  const handleDeleteSong = async (id: string) => {
    if (!confirm('¿Seguro que querés eliminar esta canción? Se borrarán también sus dedicatorias.')) return
    try {
      const { error } = await supabase.from('songs').delete().eq('id', id)
      if (error) throw error
      setSongs((prev) => prev.filter((s) => s.id !== id))
      setDedications((prev) => prev.filter((d) => d.song_id !== id))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar'
      alert(msg)
    }
  }

  // Add song
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newArtist.trim()) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('songs')
        .insert({
          title: newTitle.trim(),
          artist: newArtist.trim(),
          is_played: false,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setSongs((prev) => [...prev, data])
        setNewTitle('')
        setNewArtist('')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al agregar canción'
      alert(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper to count dedications per song
  const getDedicationCount = (songId: string) => {
    return dedications.filter((d) => d.song_id === songId).length
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner font-bold">
              CS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Panel Admin</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">Canciones Semáforo</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onSwitchToGuest}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver como Invitado</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-8 flex-1">
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* View Switcher Tabs on Mobile / Desktop */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('songs')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'songs'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Canciones ({songs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('dedications')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dedications'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Dedicatorias ({dedications.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Cargando datos del evento...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Center Column: Song Management */}
            {activeTab === 'songs' && (
              <div className="lg:col-span-2 space-y-6">
                {/* Add Song Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    Agregar Nueva Canción al Repertorio
                  </h2>
                  <form onSubmit={handleAddSong} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Título (ej: Mil Horas)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Artista (ej: Los Abuelos)"
                        value={newArtist}
                        onChange={(e) => setNewArtist(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="sm:col-span-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Agregar</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Songs List */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Music className="w-4 h-4 text-amber-400" />
                    Lista de Canciones ({songs.length})
                  </h2>

                  {songs.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">
                      No hay canciones cargadas aún.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {songs.map((song) => {
                        const count = getDedicationCount(song.id)
                        const isExpanded = expandedSongIds.has(song.id)
                        const songDedications = dedications.filter((d) => d.song_id === song.id)

                        return (
                          <div
                            key={song.id}
                            className={`py-4 transition-colors ${
                              song.is_played ? 'opacity-60' : 'opacity-100'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                    song.is_played
                                      ? 'bg-slate-800 text-slate-500'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  <Music className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-semibold text-sm ${song.is_played ? 'line-through text-slate-400' : 'text-white'}`}>
                                      {song.title}
                                    </span>
                                    {song.is_played ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                        YA TOCADA
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        DISPONIBLE
                                      </span>
                                    )}
                                    {count > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleSongExpanded(song.id)}
                                        aria-expanded={isExpanded}
                                        aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} dedicatorias de ${song.title}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                      >
                                        <Heart className="w-2.5 h-2.5 fill-rose-400" />
                                        <span>{count} {count === 1 ? 'dedicatoria' : 'dedicatorias'}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">{song.artist}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                  onClick={() => handleTogglePlayed(song)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    song.is_played
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                                  }`}
                                >
                                  {song.is_played ? (
                                    <>
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Reactivar</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Marcar Tocada</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteSong(song.id)}
                                  title="Eliminar canción"
                                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Expandable song dedications dropdown (accordion) */}
                            {count > 0 && isExpanded && (
                              <div
                                data-testid={`song-dedications-${song.id}`}
                                className="mt-3 pt-3 border-t border-slate-800/80 pl-2 sm:pl-11 space-y-2"
                              >
                                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
                                  Dedicatorias para esta canción:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {songDedications.map((dedication) => {
                                    const timeStr = new Date(dedication.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                    const isAnonymous = !dedication.sender_name

                                    return (
                                      <div
                                        key={dedication.id}
                                        className={`p-3 rounded-xl border text-xs transition-all ${
                                          isAnonymous
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                            : 'bg-slate-950 border-indigo-500/40 text-slate-100'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <span className="font-bold text-white flex items-center gap-1 truncate">
                                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" />
                                            Para: {dedication.recipient_name}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                            {timeStr}
                                          </span>
                                        </div>

                                        <div className="mt-1.5">
                                          {isAnonymous ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                              Anónima
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-500/40">
                                              De: {dedication.sender_name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right Column (or Dedications tab): Real-time Unmasked Dedications */}
            <div className={`space-y-6 ${activeTab === 'songs' ? 'hidden lg:block lg:col-span-1' : 'col-span-3'}`}>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                    <h2 className="text-base font-bold text-white">Dedicatorias en Vivo</h2>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                    {dedications.length} total
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  Como administrador podés ver los destinatarios y emisores de las dedicatorias en tiempo real:
                </p>

                {dedications.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Todavía nadie dedicó una canción en el evento.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {dedications.map((dedication) => {
                      const songTitle = dedication.songs?.title || 'Canción'
                      const songArtist = dedication.songs?.artist || ''
                      const timeStr = new Date(dedication.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      const isAnonymous = !dedication.sender_name

                      return (
                        <div
                          key={dedication.id}
                          className={`p-3.5 rounded-xl border transition-all group shadow-sm ${
                            isAnonymous
                              ? 'bg-slate-950/80 border-amber-500/20 hover:border-amber-500/40'
                              : 'bg-slate-950/90 border-indigo-500/30 hover:border-indigo-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                              <Heart className="w-3.5 h-3.5 fill-rose-500" />
                              Para: {dedication.recipient_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{timeStr}</span>
                          </div>

                          <div className="mb-2">
                            {isAnonymous ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Anónima
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                De: {dedication.sender_name}
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-medium text-white truncate">
                            {songTitle}
                          </p>
                          {songArtist && (
                            <p className="text-[11px] text-slate-400 truncate">{songArtist}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
