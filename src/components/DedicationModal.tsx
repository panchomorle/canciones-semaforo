import React, { useState } from 'react'
import type { Song } from '../types/database'
import { supabase } from '../lib/supabase'
import { saveClientDedicationRecord } from '../lib/clientToken'
import { Heart, X, Loader2, Sparkles, AlertCircle, Lock } from 'lucide-react'

interface DedicationModalProps {
  song: Song | null
  isOpen: boolean
  clientToken: string
  onClose: () => void
  onSuccess: (recipientName: string, song: Song) => void
}

export const DedicationModal: React.FC<DedicationModalProps> = ({
  song,
  isOpen,
  clientToken,
  onClose,
  onSuccess,
}) => {
  const [recipientName, setRecipientName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [senderName, setSenderName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !song) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedRecipient = recipientName.trim()
    if (!trimmedRecipient) {
      setErrorMessage('Por favor ingresá un nombre o apodo.')
      return
    }

    const trimmedSender = senderName.trim()
    if (!isAnonymous && !trimmedSender) {
      setErrorMessage('Por favor ingresá tu nombre o apodo.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const { error } = await supabase.from('dedications').insert({
        song_id: song.id,
        recipient_name: trimmedRecipient,
        client_token: clientToken,
        sender_name: isAnonymous ? null : trimmedSender,
      })

      if (error) {
        // Check for unique client token constraint violation
        if (error.code === '23505' || error.message.includes('unique_client_token')) {
          throw new Error('Ya utilizaste tu única dedicatoria disponible para este evento.')
        }
        // Check for RLS check failure (e.g. song was marked as played)
        if (error.code === '42501' || error.message.includes('row-level security')) {
          throw new Error('Esta canción ya no está disponible para dedicatorias.')
        }
        throw error
      }

      // Save locally to persist across tab/reload
      saveClientDedicationRecord({
        songId: song.id,
        recipientName: trimmedRecipient,
        timestamp: new Date().toISOString(),
      })

      // Broadcast event so other clients/feeds can update instantly
      try {
        const feedChannel = supabase.channel('public_feed')
        feedChannel.send({
          type: 'broadcast',
          event: 'new_dedication',
          payload: { songId: song.id },
        })
      } catch {
        // Non-blocking broadcast failure
      }

      setRecipientName('')
      setSenderName('')
      setIsAnonymous(true)
      onSuccess(trimmedRecipient, song)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar la dedicatoria. Intentalo nuevamente.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dedication-modal-title"
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative overflow-hidden"
      >
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 text-rose-400 mb-1">
          <Heart className="w-5 h-5 fill-rose-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Dedicatoria Especial</span>
        </div>
        <h2 id="dedication-modal-title" className="text-xl font-bold text-white mb-4">
          Dedicar Canción
        </h2>

        {/* Target Song Preview */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">{song.title}</h3>
            <p className="text-xs text-slate-400 truncate">{song.artist}</p>
          </div>
        </div>

        {/* Informative banners */}
        <div className="space-y-2 mb-5">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p>
              <strong>Oportunidad única:</strong> Solo podés dedicar 1 canción en todo el evento. ¡Elegí bien!
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
            <p>
              {isAnonymous ? (
                <>
                  Dedicatoria anónima: tu nombre no se registrará y solo el nombre del destinatario aparecerá en el panel en vivo.
                </>
              ) : (
                <>
                  Tu nombre solo será visible para la banda en el panel de administración. En el panel en vivo únicamente se mostrará el destinatario.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recipient-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
              ¿A quién se la dedicás?
            </label>
            <input
              id="recipient-name"
              type="text"
              maxLength={50}
              autoFocus
              required
              disabled={isSubmitting}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Nombre o apodo (ej: Sofía, Juan, Mesa 5)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:opacity-50 transition-all"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1 px-1">
              <span>Máximo 50 caracteres</span>
              <span>{recipientName.length}/50</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              id="anonymous-checkbox"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <label
              htmlFor="anonymous-checkbox"
              className="text-xs font-semibold text-slate-300 cursor-pointer select-none"
            >
              Dedicatoria anónima
            </label>
          </div>

          {!isAnonymous && (
            <div className="animate-in fade-in duration-150">
              <label htmlFor="sender-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                ¿Quién la envía?
              </label>
              <input
                id="sender-name"
                type="text"
                maxLength={50}
                required
                disabled={isSubmitting}
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Tu nombre o apodo (ej: Lucas)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:opacity-50 transition-all"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1 px-1">
                <span>Máximo 50 caracteres</span>
                <span>{senderName.length}/50</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-700/60 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !recipientName.trim()}
              className="flex-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-500/25 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Confirmar y Dedicar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
