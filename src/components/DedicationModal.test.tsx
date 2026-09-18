import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DedicationModal } from './DedicationModal'
import type { Song } from '../types/database'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue({
      send: vi.fn(),
    }),
  },
}))

describe('DedicationModal', () => {
  const mockSong: Song = {
    id: 'song-test-1',
    title: 'Crimen',
    artist: 'Gustavo Cerati',
    is_played: false,
    created_at: '2026-09-18T10:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <DedicationModal
        song={mockSong}
        isOpen={false}
        clientToken="client-token-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders song info and form when open', () => {
    render(
      <DedicationModal
        song={mockSong}
        isOpen={true}
        clientToken="client-token-1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    expect(screen.getByText('Crimen')).toBeInTheDocument()
    expect(screen.getByText('Gustavo Cerati')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Nombre o apodo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar y Dedicar/i })).toBeInTheDocument()
  })

  it('calls onClose when clicking Cancel button or Close icon', () => {
    const handleClose = vi.fn()
    render(
      <DedicationModal
        song={mockSong}
        isOpen={true}
        clientToken="client-token-1"
        onClose={handleClose}
        onSuccess={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('submits successfully and calls onSuccess with trimmed recipient name', async () => {
    const handleSuccess = vi.fn()
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    render(
      <DedicationModal
        song={mockSong}
        isOpen={true}
        clientToken="client-token-123"
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />
    )

    const input = screen.getByPlaceholderText(/Nombre o apodo/i)
    fireEvent.change(input, { target: { value: '  Julieta  ' } })

    const submitBtn = screen.getByRole('button', { name: /Confirmar y Dedicar/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        song_id: 'song-test-1',
        recipient_name: 'Julieta',
        client_token: 'client-token-123',
      })
      expect(handleSuccess).toHaveBeenCalledWith('Julieta', mockSong)
    })
  })

  it('displays user-friendly error on unique constraint violation (duplicate dedication)', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'unique_client_token violation' },
    })
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    render(
      <DedicationModal
        song={mockSong}
        isOpen={true}
        clientToken="client-token-123"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/Nombre o apodo/i)
    fireEvent.change(input, { target: { value: 'Martín' } })
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y Dedicar/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Ya utilizaste tu única dedicatoria disponible/i)
      ).toBeInTheDocument()
    })
  })
})
