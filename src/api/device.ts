// This browser's device id (Backend spec 021). The Backend remembers a device by a hash of
// `X-Device-Id` + `X-Device-Platform`; a founder signing in from a device it does not know
// is held until the other founder approves it. The id is created once and kept in
// localStorage, so clearing the site's data makes this browser a new device (intended).
// It is shown only on the "Waiting for approval" screen, for the server's
// `founder:trust-device` command; never logged or sent anywhere else.

const STORAGE_KEY = 'dahab.device_id'

export const DEVICE_PLATFORM = 'web'

// Used when storage is blocked (a private window): one id for this page's life.
let fallback: string | null = null

function newId (): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Older browsers: 128 random bits as hex.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export function deviceId (): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return stored
    }
    const id = newId()
    localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    fallback ??= newId()
    return fallback
  }
}
