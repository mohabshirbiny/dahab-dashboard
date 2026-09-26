import type {
  MfaChallenge,
  MfaEnrollment,
  Permission,
  StaffLoginPayload,
  StaffSession,
  StaffUser,
} from '@/types/staff'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAccessToken, setSession } from '@/api/session'
import { queryClient } from '@/plugins/vue-query'
import { errorCodeOf } from '@/services/errors'
import { staffAuthService } from '@/services/staff-auth.service'

// Between a successful password step and a successful MFA step. `enroll` is
// the first sign-in of a role that must use an authenticator app.
export type PendingMfa
  = | ({ kind: 'verify', email: string } & MfaChallenge)
    | ({ kind: 'enroll', email: string } & MfaEnrollment)

export type LoginOutcome = 'authenticated' | 'mfa_required' | 'mfa_enrollment_required'

let initialization: Promise<void> | null = null

export const useAuthStore = defineStore('auth', () => {
  const user = ref<StaffUser | null>(null)
  const pendingMfa = ref<PendingMfa | null>(null)
  // `initializing` until the stored session has been checked once.
  const status = ref<'initializing' | 'ready'>('initializing')

  const isAuthenticated = computed(() => user.value !== null)
  const isInitializing = computed(() => status.value === 'initializing')

  function can (permission: Permission): boolean {
    return Boolean(user.value?.permissions.includes(permission))
  }

  function canAll (permissions: readonly Permission[]): boolean {
    return permissions.every(p => user.value?.permissions.includes(p))
  }

  function startSession (session: StaffSession) {
    pendingMfa.value = null
    setSession(session.tokens)
    user.value = session.staff
  }

  function clearSession () {
    user.value = null
    pendingMfa.value = null
    setSession(null)
    // Cached identity data belongs to the previous staff member.
    queryClient.clear()
  }

  // Restores the session from the stored tokens. Safe to call from every guard.
  function initialize (): Promise<void> {
    if (status.value === 'ready') {
      return Promise.resolve()
    }
    initialization ??= (async () => {
      if (getAccessToken()) {
        try {
          // Permissions are always re-read from the server, never trusted from storage.
          // An expired access token is renewed by the API client on the way.
          user.value = await staffAuthService.getCurrentStaff()
        } catch (error) {
          // Only a rejected session ends it. A server that is briefly unreachable
          // must not throw away a session that is still good.
          if (errorCodeOf(error) === 'unauthenticated') {
            clearSession()
          }
        }
      }
      status.value = 'ready'
    })()
    return initialization
  }

  async function login (payload: StaffLoginPayload): Promise<LoginOutcome> {
    const result = await staffAuthService.login(payload)
    const email = payload.email.trim().toLowerCase()
    switch (result.status) {
      case 'mfa_required': {
        pendingMfa.value = { kind: 'verify', sessionRef: result.sessionRef, expiresAt: result.expiresAt, email }
        return 'mfa_required'
      }
      case 'mfa_enrollment_required': {
        pendingMfa.value = {
          kind: 'enroll',
          sessionRef: result.sessionRef,
          expiresAt: result.expiresAt,
          otpauthUrl: result.otpauthUrl,
          recoveryCodes: result.recoveryCodes,
          email,
        }
        return 'mfa_enrollment_required'
      }
      default: {
        startSession(result)
        return 'authenticated'
      }
    }
  }

  async function verifyMfa (code: string) {
    if (pendingMfa.value?.kind !== 'verify') {
      throw new Error('No verification in progress')
    }
    startSession(await staffAuthService.verifyMfa({ sessionRef: pendingMfa.value.sessionRef, code }))
  }

  async function enrollMfa (code: string) {
    if (pendingMfa.value?.kind !== 'enroll') {
      throw new Error('No enrollment in progress')
    }
    startSession(await staffAuthService.enrollMfa({ sessionRef: pendingMfa.value.sessionRef, code }))
  }

  // Back from the MFA screen to the login screen.
  function cancelMfa () {
    pendingMfa.value = null
  }

  async function logout () {
    try {
      await staffAuthService.logout()
    } catch {
      // Signing out locally must never depend on the server answering.
    }
    clearSession()
  }

  return {
    user,
    pendingMfa,
    status,
    isAuthenticated,
    isInitializing,
    can,
    canAll,
    initialize,
    login,
    verifyMfa,
    enrollMfa,
    cancelMfa,
    logout,
    startSession,
    clearSession,
  }
})
