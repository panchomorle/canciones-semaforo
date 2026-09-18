import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DedicationFeed } from './DedicationFeed'
import type { PublicDedication, Song } from '../types/database'

describe('DedicationFeed', () => {
  const mockSongsMap: Record<string, Song> = {
    's-1': {
      id: 's-1',
      title: 'De Música Ligera',
      artist: 'Soda Stereo',
      is_played: false,
      created_at: '2026-09-18T10:00:00Z',
    },
    's-2': {
      id: 's-2',
      title: 'Mil Horas',
      artist: 'Los Abuelos de la Nada',
      is_played: true,
      created_at: '2026-09-18T10:05:00Z',
    },
  }

  it('renders empty message when there are no dedications', () => {
    render(<DedicationFeed dedications={[]} songsMap={mockSongsMap} />)
    expect(screen.getByText(/Aún no hay dedicatorias/i)).toBeInTheDocument()
  })

  it('renders unmasked recipient name for all public dedications and retains "Tu dedicatoria" for own', () => {
    const mockDedications: PublicDedication[] = [
      {
        id: 'd-1',
        song_id: 's-1',
        recipient_name: 'Martina',
        is_mine: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'd-2',
        song_id: 's-2',
        recipient_name: 'Camila',
        is_mine: true,
        created_at: new Date().toISOString(),
      },
    ]

    render(
      <DedicationFeed
        dedications={mockDedications}
        songsMap={mockSongsMap}
      />
    )

    // Other user's unmasked dedication
    expect(screen.getByText(/Para:/i)).toBeInTheDocument()
    expect(screen.getByText('Martina')).toBeInTheDocument()
    expect(screen.getByText('De Música Ligera')).toBeInTheDocument()
    expect(screen.getByText('Soda Stereo')).toBeInTheDocument()

    // Own dedication retains "Tu dedicatoria" badge
    expect(screen.getByText('Tu dedicatoria')).toBeInTheDocument()
    expect(screen.getByText('Camila')).toBeInTheDocument()
    expect(screen.getByText('Mil Horas')).toBeInTheDocument()
    expect(screen.getByText('Los Abuelos de la Nada')).toBeInTheDocument()

    // Does NOT render "Alguien especial"
    expect(screen.queryByText('Alguien especial')).not.toBeInTheDocument()
  })

  it('never renders sender name in the feed', () => {
    const mockDedications: (PublicDedication & { sender_name?: string })[] = [
      {
        id: 'd-1',
        song_id: 's-1',
        recipient_name: 'Martina',
        sender_name: 'Lucas Secret',
        is_mine: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'd-2',
        song_id: 's-2',
        recipient_name: 'Camila',
        sender_name: 'Juan Secret',
        is_mine: true,
        created_at: new Date().toISOString(),
      },
    ]

    render(
      <DedicationFeed
        dedications={mockDedications}
        songsMap={mockSongsMap}
      />
    )

    expect(screen.queryByText(/Lucas Secret/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Juan Secret/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/De:/i)).not.toBeInTheDocument()
  })
})
