import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Song, PublicDedication } from '../types/database'
import { getClientToken, getClientDedicationRecord, type ClientDedicationRecord } from '../lib/clientToken'
import { DedicationModal } from './DedicationModal'
import { DedicationFeed } from './DedicationFeed'
import { 
  Music, 
  Search, 
  Heart, 
  CheckCircle2, 
  Radio, 
  Shield, 
  Sparkles, 
  Loader2, 
  PartyPopper,
  X
} from 'lucide-react'

interface GuestViewProps {
  onNavigateToAdmin: () => void
  isAdminSession?: boolean
}

export const GuestView: React.FC<GuestViewProps> = ({ onNavigateToAdmin, isAdminSession = false }) => {
  const [songs, setSongs] = useState<Song[]>([])
  const [dedications, setDedications] = useState<PublicDedication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'available' | 'played'>('all')
  const [mobileTab, setMobileTab] = useState<'songs' | 'feed'>('songs')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; subtext?: string } | null>(null)

  // Local client token and local dedication record
  const clientToken = useMemo(() => getClientToken(), [])
  const [myDedicationRecord, setMyDedicationRecord] = useState<ClientDedicationRecord | null>(() => 
    getClientDedicationRecord()
  )

  // Fetch songs from Supabase
  const fetchSongs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      if (data) setSongs(data)
    } catch (err) {
      console.error('Error fetching songs:', err)
    }
  }, [])

  // Fetch public masked dedications via RPC
  const fetchPublicDedications = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_public_dedications', {
        p_client_token: clientToken,
      })

      if (error) throw error
      if (data) {
        const publicList = data as PublicDedication[]
        setDedications(publicList)

        // Check if any dedication belongs to this client
        const myDed = publicList.find((d) => d.is_mine)
        if (myDed) {
          setMyDedicationRecord({
            songId: myDed.song_id,
            recipientName: myDed.recipient_name,
            timestamp: myDed.created_at,
          })
        }
      }
    } catch (err) {
      console.error('Error fetching public dedications:', err)
    }
  }, [clientToken])

  // Initial load
  useEffect(() => {
    const initData = async () => {
      setLoading(true)
      await Promise.all([fetchSongs(), fetchPublicDedications()])
      setLoading(false)
    }
    initData()
  }, [fetchSongs, fetchPublicDedications])

  // Real-time subscriptions & polling
  useEffect(() => {
    // 1. Realtime subscription for songs table changes (is_played, adds, deletes)
    const songsChannel = supabase
      .channel('guest_songs_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        () => {
          fetchSongs()
        }
      )
      .subscribe()

    // 2. Broadcast channel for instant dedication events
    const feedBroadcastChannel = supabase
      .channel('public_feed')
      .on('broadcast', { event: 'new_dedication' }, () => {
        fetchPublicDedications()
      })
      .subscribe()

    // 3. Fallback polling every 8s to guarantee sync
    const interval = setInterval(() => {
      fetchPublicDedications()
    }, 8000)

    return () => {
      supabase.removeChannel(songsChannel)
      supabase.removeChannel(feedBroadcastChannel)
      clearInterval(interval)
    }
  }, [fetchSongs, fetchPublicDedications])

  // Derived state: songs map by id for quick lookup in feed
  const songsMap = useMemo(() => {
    const map: Record<string, Song> = {}
    for (const song of songs) {
      map[song.id] = song
    }
    return map
  }, [songs])

  // Dedication counts per song
  const dedicationCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of dedications) {
      counts[d.song_id] = (counts[d.song_id] || 0) + 1
    }
    return counts
  }, [dedications])

  // Has client already used single-opportunity dedication?
  const hasDedicated = Boolean(
    myDedicationRecord || dedications.some((d) => d.is_mine)
  )

  // My dedicated song object if found
  const myDedicatedSong = myDedicationRecord
    ? songsMap[myDedicationRecord.songId]
    : undefined

  // Filter and search songs
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchesSearch =
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (filterTab === 'available') return !song.is_played
      if (filterTab === 'played') return song.is_played
      return true
    })
  }, [songs, searchQuery, filterTab])

  // Handle click to dedicate
  const handleOpenDedicate = (song: Song) => {
    if (song.is_played || hasDedicated) return
    setSelectedSong(song)
    setIsModalOpen(true)
  }

  // Handle successful dedication
  const handleDedicationSuccess = (recipientName: string, song: Song) => {
    setIsModalOpen(false)
    setSelectedSong(null)

    const newRecord: ClientDedicationRecord = {
      songId: song.id,
      recipientName,
      timestamp: new Date().toISOString(),
    }
    setMyDedicationRecord(newRecord)

    // Show toast
    setToastMessage({
      text: `¡Dedicaste "${song.title}" con éxito!`,
      subtext: `Para: ${recipientName}. La banda ya tiene tu dedicatoria.`,
    })

    // Refetch dedications immediately
    fetchPublicDedications()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20 text-sm">
              CS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Canciones Semáforo
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Evento en Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">Elegí tu canción favorita y dedicala</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToAdmin}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAdminSession ? 'Volver al Admin' : 'Admin'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 flex-1">
        {/* Success Toast */}
        {toastMessage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-rose-950/80 to-amber-950/80 border border-rose-500/40 rounded-2xl flex items-start justify-between gap-3 text-white shadow-xl shadow-rose-950/30 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500 text-white rounded-xl">
                <PartyPopper className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{toastMessage.text}</p>
                {toastMessage.subtext && (
                  <p className="text-xs text-rose-200/90 mt-0.5">{toastMessage.subtext}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* User Dedicated Banner (Single Opportunity Reminder) */}
        {hasDedicated && (
          <div className="mb-6 p-4 sm:p-5 bg-slate-900/90 border border-rose-500/30 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 fill-rose-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    ¡Ya enviaste tu dedicatoria!
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Oportunidad usada
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Dedicaste {myDedicatedSong ? <strong>&quot;{myDedicatedSong.title}&quot;</strong> : 'tu canción'}{' '}
                  para <strong className="text-rose-300">{myDedicationRecord?.recipientName}</strong>. ¡Estate atento cuando suene!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile View Switcher (Tabs between Songs and Live Feed) */}
        <div className="flex lg:hidden gap-2 mb-5 border-b border-slate-800 pb-3">
          <button
            onClick={() => setMobileTab('songs')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mobileTab === 'songs'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Canciones ({songs.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('feed')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mobileTab === 'feed'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Dedicatorias ({dedications.length})</span>
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left / Main Column: Songs Catalog */}
          <div className={`space-y-6 ${mobileTab === 'feed' ? 'hidden lg:block lg:col-span-2' : 'col-span-1 lg:col-span-2'}`}>
            {/* Search & Filter Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por título o artista..."
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 self-center sm:self-auto bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === 'all'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({songs.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('available')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === 'available'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Disponibles ({songs.filter((s) => !s.is_played).length})
                  </button>
                  <button
                    onClick={() => setFilterTab('played')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === 'played'
                        ? 'bg-slate-800 text-slate-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tocadas ({songs.filter((s) => s.is_played).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Song Cards List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                <p className="text-slate-400 text-sm">Cargando repertorio del evento...</p>
              </div>
            ) : filteredSongs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                <Music className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">No se encontraron canciones</p>
                <p className="text-xs mt-1">Probá con otro término de búsqueda o filtro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredSongs.map((song) => {
                  const isMySong = myDedicationRecord?.songId === song.id
                  const count = dedicationCounts[song.id] || 0

                  return (
                    <div
                      key={song.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        song.is_played
                          ? 'bg-slate-900/40 border-slate-850 opacity-60'
                          : isMySong
                          ? 'bg-gradient-to-r from-rose-950/30 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/20'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                      }`}
                    >
                      {/* Song Information */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            song.is_played
                              ? 'bg-slate-850 text-slate-600'
                              : isMySong
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <Music className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`text-sm sm:text-base font-bold truncate ${
                                song.is_played
                                  ? 'line-through text-slate-400'
                                  : 'text-white'
                              }`}
                            >
                              {song.title}
                            </h3>

                            {song.is_played ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                YA TOCADA
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                DISPONIBLE
                              </span>
                            )}

                            {isMySong && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                                <Heart className="w-2.5 h-2.5 fill-white" />
                                Tu canción elegida
                              </span>
                            )}

                            {!isMySong && count > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <Heart className="w-2.5 h-2.5 fill-rose-400" />
                                {count} {count === 1 ? 'dedicatoria' : 'dedicatorias'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center sm:self-center self-end">
                        {song.is_played ? (
                          <button
                            disabled
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-500 cursor-not-allowed flex items-center gap-1.5 border border-slate-800"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ya tocada</span>
                          </button>
                        ) : isMySong ? (
                          <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 fill-rose-400" />
                            <span>Dedicada a {myDedicationRecord?.recipientName}</span>
                          </span>
                        ) : hasDedicated ? (
                          <button
                            disabled
                            title="Ya utilizaste tu única dedicatoria"
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 cursor-not-allowed flex items-center gap-1.5"
                          >
                            <Heart className="w-3.5 h-3.5" />
                            <span>Ya dedicaste</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenDedicate(song)}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/25 hover:shadow-rose-500/40 cursor-pointer"
                          >
                            <Heart className="w-3.5 h-3.5 fill-white" />
                            <span>Dedicar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Dedications Activity Feed (Desktop always, mobile conditionally) */}
          <div className={`space-y-6 ${mobileTab === 'songs' ? 'hidden lg:block lg:col-span-1' : 'col-span-1 lg:col-span-1'}`}>
            <div className="sticky top-20">
              <DedicationFeed
                dedications={dedications}
                songsMap={songsMap}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Dedication Modal */}
      <DedicationModal
        isOpen={isModalOpen}
        song={selectedSong}
        clientToken={clientToken}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedSong(null)
        }}
        onSuccess={handleDedicationSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-500" />
            <span>Canciones Semáforo — Evento en vivo</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>1 dedicatoria por persona</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
