export const CLIENT_TOKEN_KEY = 'canciones_client_token'
export const DEDICATION_RECORD_KEY = 'canciones_client_dedication'

export interface ClientDedicationRecord {
  songId: string
  recipientName: string
  timestamp: string
}

/**
 * Retrieves the client's anonymous voting token from localStorage.
 * If none exists, creates and stores a new standard UUID.
 */
export function getClientToken(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'ssr-token'
  }

  let token = localStorage.getItem(CLIENT_TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(CLIENT_TOKEN_KEY, token)
  }
  return token
}

/**
 * Clears the stored client token from localStorage.
 */
export function clearClientToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CLIENT_TOKEN_KEY)
    localStorage.removeItem(DEDICATION_RECORD_KEY)
  }
}

/**
 * Retrieves local record of dedication sent by this client if any.
 */
export function getClientDedicationRecord(): ClientDedicationRecord | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(DEDICATION_RECORD_KEY)
    return raw ? (JSON.parse(raw) as ClientDedicationRecord) : null
  } catch {
    return null
  }
}

/**
 * Persists local record of dedication sent by this client.
 */
export function saveClientDedicationRecord(record: ClientDedicationRecord): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DEDICATION_RECORD_KEY, JSON.stringify(record))
  }
}

