import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { GuestView } from './GuestView'
import { supabase } from '../lib/supabase'
import type { Song, PublicDedication } from '../types/database'

vi.mock('../lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    send: vi.fn(),
  }

  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    },
  }
})

describe('GuestView', () => {
  const mockSongs: Song[] = [
    {
      id: 'song-1',
      title: 'De Música Ligera',
      artist: 'Soda Stereo',
      is_played: false,
      created_at: '2026-09-18T10:00:00Z',
    },
    {
      id: 'song-2',
      title: 'Mil Horas',
      artist: 'Los Abuelos de la Nada',
      is_played: true,
      created_at: '2026-09-18T10:05:00Z',
    },
    {
      id: 'song-3',
      title: 'Seguir Viviendo Sin Tu Amor',
      artist: 'Luis Alberto Spinetta',
      is_played: false,
      created_at: '2026-09-18T10:10:00Z',
    },
  ]

  const mockPublicDedications: PublicDedication[] = [
    {
      id: 'ded-1',
      song_id: 'song-2',
      recipient_name: 'Alguien especial',
      is_mine: false,
      created_at: '2026-09-18T10:06:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockSongs, error: null }),
      }),
    } as any)

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockPublicDedications,
      error: null,
    } as any)
  })

  it('loads and displays song list with availability indicators', async () => {
    render(<GuestView onNavigateToAdmin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'De Música Ligera' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Mil Horas' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Seguir Viviendo Sin Tu Amor' })).toBeInTheDocument()
    })

    // Played song has "YA TOCADA" badge and disabled button
    expect(screen.getByText('YA TOCADA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ya tocada/i })).toBeDisabled()

    // Available song has "Dedicar" button
    const dedicateButtons = screen.getAllByRole('button', { name: /Dedicar/i })
    expect(dedicateButtons.length).toBeGreaterThan(0)
  })

  it('filters songs by search query', async () => {
    render(<GuestView onNavigateToAdmin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'De Música Ligera' })).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Buscar por título o artista/i)
    fireEvent.change(searchInput, { target: { value: 'Spinetta' } })

    expect(screen.queryByRole('heading', { level: 3, name: 'De Música Ligera' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Mil Horas' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Seguir Viviendo Sin Tu Amor' })).toBeInTheDocument()
  })

  it('filters songs by status tabs (Todas, Disponibles, Tocadas)', async () => {
    render(<GuestView onNavigateToAdmin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: 'De Música Ligera' })).toBeInTheDocument()
    })

    // Click "Tocadas"
    const playedTab = screen.getByRole('button', { name: /Tocadas/i })
    fireEvent.click(playedTab)

    expect(screen.queryByRole('heading', { level: 3, name: 'De Música Ligera' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Mil Horas' })).toBeInTheDocument()

    // Click "Disponibles"
    const availableTab = screen.getByRole('button', { name: /Disponibles/i })
    fireEvent.click(availableTab)

    expect(screen.getByRole('heading', { level: 3, name: 'De Música Ligera' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Seguir Viviendo Sin Tu Amor' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Mil Horas' })).not.toBeInTheDocument()
  })

  it('opens dedication modal when clicking Dedicar on available song', async () => {
    render(<GuestView onNavigateToAdmin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('De Música Ligera')).toBeInTheDocument()
    })

    const dedicateButtons = screen.getAllByRole('button', { name: /Dedicar/i })
    fireEvent.click(dedicateButtons[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Dedicar Canción')).toBeInTheDocument()
  })

  it('shows single-opportunity banner when client has already dedicated a song', async () => {
    // Return a dedication that is mine
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          id: 'ded-mine',
          song_id: 'song-1',
          recipient_name: 'Mariana',
          is_mine: true,
          created_at: '2026-09-18T10:02:00Z',
        },
      ],
      error: null,
    } as any)

    render(<GuestView onNavigateToAdmin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/¡Ya enviaste tu dedicatoria!/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Mariana/i).length).toBeGreaterThanOrEqual(1)
    })

    // On other available songs, dedication button should be disabled as "Ya dedicaste"
    const disabledButtons = screen.getAllByRole('button', { name: /Ya dedicaste/i })
    expect(disabledButtons.length).toBeGreaterThanOrEqual(1)
    expect(disabledButtons[0]).toBeDisabled()
  })
})
