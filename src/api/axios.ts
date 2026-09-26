import type { ApiEnvelope, ApiSession } from '@/types/api'
import axios, { type AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { toServiceError } from '@/services/errors'
import { endpoints } from './endpoints'
import { getAccessToken, getRefreshToken, notifySessionExpired, setSession } from './session'

declare module 'axios' {
  interface AxiosRequestConfig {
    // Sign-in, MFA and refresh calls: a 401 there is an answer, not an expired session.
    skipAuthRefresh?: boolean
    // Set once a request has been replayed after a refresh, so it is replayed at most once.
    retriedAfterRefresh?: boolean
  }
}

// The Backend API root, for example `https://api.example.com/api/v1`.
// Set it per environment in `.env.*`; the fallback is a same-origin deployment.
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.request.use(config => {
  // An explicit Authorization (the refresh call sends the refresh token) is left alone.
  const token = getAccessToken()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const locale = typeof localStorage === 'undefined' ? null : localStorage.getItem('vp_admin_locale')
  if (locale) {
    config.headers['Accept-Language'] = locale
  }

  return config
})

// Concurrent 401s share one refresh: the refresh token rotates on every use,
// and replaying an old one makes the Backend revoke the whole session.
let refreshing: Promise<void> | null = null

function refreshSession (): Promise<void> {
  refreshing ??= (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token')
    }
    const { data } = await http.post<ApiEnvelope<ApiSession>>(endpoints.staffRefresh, undefined, {
      headers: { Authorization: `Bearer ${refreshToken}` },
      skipAuthRefresh: true,
    })
    setSession({ accessToken: data.data.access_token, refreshToken: data.data.refresh_token })
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

function canRefresh (error: AxiosError): error is AxiosError & { config: InternalAxiosRequestConfig } {
  const config = error.config
  return error.response?.status === 401
    && config !== undefined
    && !config.skipAuthRefresh
    && !config.retriedAfterRefresh
    && getRefreshToken() !== null
}

http.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && canRefresh(error)) {
      try {
        await refreshSession()
      } catch {
        // The session cannot be renewed: it is over.
        setSession(null)
        notifySessionExpired()
        throw toServiceError(error)
      }
      // Replay with the new access token: drop the expired one so the request
      // interceptor sets the fresh one.
      const headers = AxiosHeaders.from(error.config.headers)
      headers.delete('Authorization')
      return http({ ...error.config, headers, retriedAfterRefresh: true })
    }
    throw toServiceError(error)
  },
)
