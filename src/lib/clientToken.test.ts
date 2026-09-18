import { describe, it, expect, beforeEach } from 'vitest'
import { 
  getClientToken, 
  clearClientToken, 
  CLIENT_TOKEN_KEY,
  getClientDedicationRecord,
  saveClientDedicationRecord
} from './clientToken'

describe('clientToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generates and persists a new UUID client token when none exists', () => {
    const token = getClientToken()
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(10)
    expect(localStorage.getItem(CLIENT_TOKEN_KEY)).toBe(token)
  })

  it('returns the existing client token if already present in localStorage', () => {
    const existingToken = 'test-uuid-1234-5678'
    localStorage.setItem(CLIENT_TOKEN_KEY, existingToken)

    const token = getClientToken()
    expect(token).toBe(existingToken)
  })

  it('clears the client token properly', () => {
    localStorage.setItem(CLIENT_TOKEN_KEY, 'some-token')
    clearClientToken()
    expect(localStorage.getItem(CLIENT_TOKEN_KEY)).toBeNull()
  })

  it('stores and retrieves client dedication record', () => {
    expect(getClientDedicationRecord()).toBeNull()
    const record = {
      songId: 'song-123',
      recipientName: 'Micaela',
      timestamp: new Date().toISOString()
    }
    saveClientDedicationRecord(record)
    expect(getClientDedicationRecord()).toEqual(record)
  })
})
