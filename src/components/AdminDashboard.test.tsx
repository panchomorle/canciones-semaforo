import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AdminDashboard } from './AdminDashboard'
import { supabase } from '../lib/supabase'
import type { Song, Dedication } from '../types/database'

vi.mock('../lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }

  return {
    supabase: {
      from: vi.fn(),
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    },
  }
})

describe('AdminDashboard', () => {
  const mockSongs: Song[] = [
    {
      id: 'song-1',
      title: 'Crimen',
      artist: 'Gustavo Cerati',
      is_played: false,
      created_at: '2026-09-18T10:00:00Z',
    },
    {
      id: 'song-2',
      title: 'Mil Horas',
      artist: 'Los Abuelos de la Nada',
      is_played: false,
      created_at: '2026-09-18T10:05:00Z',
    },
    {
      id: 'song-3',
      title: 'Sin Dedicatorias',
      artist: 'Artista X',
      is_played: false,
      created_at: '2026-09-18T10:10:00Z',
    },
  ]

  const mockDedications: Dedication[] = [
    {
      id: 'ded-1',
      song_id: 'song-1',
      recipient_name: 'Camila',
      sender_name: 'Lucas',
      created_at: '2026-09-18T10:15:00Z',
      songs: mockSongs[0],
    },
    {
      id: 'ded-2',
      song_id: 'song-1',
      recipient_name: 'Mateo',
      sender_name: null,
      created_at: '2026-09-18T10:20:00Z',
      songs: mockSongs[0],
    },
    {
      id: 'ded-3',
      song_id: 'song-2',
      recipient_name: 'Valentina',
      sender_name: 'Sofía',
      created_at: '2026-09-18T10:25:00Z',
      songs: mockSongs[1],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'songs') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockSongs, error: null }),
          }),
        } as any
      }
      if (table === 'dedications') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockDedications, error: null }),
          }),
        } as any
      }
      return {} as any
    })
  })

  it('renders live feed cards with signed ("De: [Sender]") vs anonymous ("Anónima") badges and distinct styling', async () => {
    render(<AdminDashboard onLogout={vi.fn()} onSwitchToGuest={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Panel Admin')).toBeInTheDocument()
    })

    // Signed dedication badge in live feed
    expect(screen.getByText('De: Lucas')).toBeInTheDocument()
    expect(screen.getByText('De: Sofía')).toBeInTheDocument()

    // Anonymous dedication badge in live feed
    const anonymousBadges = screen.getAllByText('Anónima')
    expect(anonymousBadges.length).toBeGreaterThanOrEqual(1)

    // Recipient names are displayed
    expect(screen.getByText(/Para: Camila/i)).toBeInTheDocument()
    expect(screen.getByText(/Para: Mateo/i)).toBeInTheDocument()
    expect(screen.getByText(/Para: Valentina/i)).toBeInTheDocument()
  })

  it('expands and collapses song dedications dropdown (accordion)', async () => {
    render(<AdminDashboard onLogout={vi.fn()} onSwitchToGuest={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Crimen').length).toBeGreaterThanOrEqual(1)
    })

    // Crimen has 2 dedications
    const expandButton = screen.getByRole('button', {
      name: /Ver dedicatorias de Crimen/i,
    })
    expect(expandButton).toBeInTheDocument()
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')

    // Dropdown container is not visible initially
    expect(screen.queryByTestId('song-dedications-song-1')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(expandButton)
    expect(expandButton).toHaveAttribute('aria-expanded', 'true')

    const dropdown = screen.getByTestId('song-dedications-song-1')
    expect(dropdown).toBeInTheDocument()
    expect(dropdown).toHaveTextContent('Para: Camila')
    expect(dropdown).toHaveTextContent('Para: Mateo')

    // Click to collapse
    fireEvent.click(expandButton)
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('song-dedications-song-1')).not.toBeInTheDocument()
  })

  it('styles anonymous dedications with yellow/amber accents inside the accordion dropdown', async () => {
    render(<AdminDashboard onLogout={vi.fn()} onSwitchToGuest={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Crimen').length).toBeGreaterThanOrEqual(1)
    })

    const expandButton = screen.getByRole('button', {
      name: /Ver dedicatorias de Crimen/i,
    })
    fireEvent.click(expandButton)

    const dropdown = screen.getByTestId('song-dedications-song-1')
    expect(dropdown).toBeInTheDocument()

    // Find anonymous dedication badge inside dropdown
    const anonymousBadge = dropdown.querySelector('.bg-amber-500\\/20')
    expect(anonymousBadge).toBeInTheDocument()
    expect(anonymousBadge).toHaveTextContent('Anónima')

    // Verify amber styling class is present on the anonymous card
    const amberCard = dropdown.querySelector('.border-amber-500\\/30')
    expect(amberCard).toBeInTheDocument()
    expect(amberCard).toHaveTextContent('Para: Mateo')

    // Verify signed dedication has prominent sender name
    const signedBadge = dropdown.querySelector('.bg-indigo-500\\/25')
    expect(signedBadge).toBeInTheDocument()
    expect(signedBadge).toHaveTextContent('De: Lucas')
  })

  it('does not display expandable accordion button for songs with 0 dedications', async () => {
    render(<AdminDashboard onLogout={vi.fn()} onSwitchToGuest={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Sin Dedicatorias')).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('button', {
        name: /dedicatorias de Sin Dedicatorias/i,
      })
    ).not.toBeInTheDocument()
  })
})
