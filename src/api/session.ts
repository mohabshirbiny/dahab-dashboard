// The one place the staff session lives. The Axios interceptors and the auth
// store both go through here.
//
// The backend issues a short-lived access token and a rotating refresh token.
// Both are kept in localStorage, like the access token always was.
const STORAGE_KEY = 'dahab_admin_session'
// Older builds stored a single mock token here.
const LEGACY_KEY = 'vp_admin_token'

export interface StoredSession {
  accessToken: string
  refreshToken: string
}

// Only used when storage is blocked: then the session lasts for this page only.
let memory: StoredSession | null = null

function parse (raw: string): StoredSession | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' && value !== null
      && typeof (value as StoredSession).accessToken === 'string'
      && typeof (value as StoredSession).refreshToken === 'string'
    ) {
      return value as StoredSession
    }
  } catch {
    // Unreadable content counts as no session.
  }
  return null
}

// Storage is the source of truth, read on every call: the refresh token rotates,
// and a second tab must never replay one that another tab has already used
// (the Backend would revoke the whole session). The in-memory copy is only a
// fallback for blocked storage.
export function getSession (): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parse(raw) : null
  } catch {
    return memory
  }
}

export function setSession (session: StoredSession | null): void {
  memory = session
  try {
    localStorage.removeItem(LEGACY_KEY)
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be blocked. The in-memory copy still serves this page.
  }
}

export function getAccessToken (): string | null {
  return getSession()?.accessToken ?? null
}

export function getRefreshToken (): string | null {
  return getSession()?.refreshToken ?? null
}

// Called by the API client when a session cannot be renewed, so the app can
// sign the person out. Registered once at start-up, which keeps the API layer
// free of any import from the stores and the router.
type SessionExpiredHandler = () => void
let onSessionExpired: SessionExpiredHandler | null = null

export function setSessionExpiredHandler (handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler
}

export function notifySessionExpired (): void {
  onSessionExpired?.()
}
