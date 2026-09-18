import React from 'react'
import type { PublicDedication, Song } from '../types/database'
import { Heart, Radio, Sparkles, UserCheck } from 'lucide-react'

interface DedicationFeedProps {
  dedications: PublicDedication[]
  songsMap: Record<string, Song>
  loading?: boolean
}

export const DedicationFeed: React.FC<DedicationFeedProps> = ({
  dedications,
  songsMap,
  loading = false,
}) => {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMin = Math.floor(diffMs / 60000)

      if (diffMin < 1) return 'Recién'
      if (diffMin < 60) return `hace ${diffMin}m`
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Dedicatorias en Vivo
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Heart className="w-2.5 h-2.5 fill-rose-500" />
            {dedications.length} {dedications.length === 1 ? 'total' : 'totales'}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Las dedicatorias del evento se transmiten en tiempo real manteniendo el misterio.
      </p>

      {/* Dedication List */}
      {loading && dedications.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          <p>Cargando dedicatorias...</p>
        </div>
      ) : dedications.length === 0 ? (
        <div className="py-12 px-4 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <Sparkles className="w-6 h-6 text-slate-600 mb-1" />
          <p className="font-semibold text-slate-400">Aún no hay dedicatorias</p>
          <p className="text-[11px] max-w-xs">
            ¡Sé la primera persona en dedicar una canción de la noche!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1">
          {dedications.map((dedication) => {
            const song = songsMap[dedication.song_id]
            const songTitle = song?.title || 'Canción'
            const songArtist = song?.artist || ''
            const timeStr = formatTime(dedication.created_at)

            return (
              <div
                key={dedication.id}
                className={`p-3.5 rounded-xl border transition-all text-xs ${
                  dedication.is_mine
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/50'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {dedication.is_mine ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                        <UserCheck className="w-3 h-3" />
                        Tu dedicatoria
                      </span>
                    ) : (
                      <span className="text-rose-400/90 font-medium flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-500/70" />
                        Para:
                      </span>
                    )}
                    <span
                      className={`font-semibold truncate ${
                        dedication.is_mine ? 'text-rose-300' : 'text-slate-300'
                      }`}
                    >
                      {dedication.recipient_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {timeStr}
                  </span>
                </div>

                <div className="pl-0.5">
                  <p className="font-semibold text-white truncate text-xs">
                    {songTitle}
                  </p>
                  {songArtist && (
                    <p className="text-[11px] text-slate-400 truncate">
                      {songArtist}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
