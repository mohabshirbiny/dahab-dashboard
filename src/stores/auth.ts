import type {
  DeviceApprovalPending,
  DeviceCodePending,
  MfaChallenge,
  MfaEnrollment,
  Permission,
  StaffLoginPayload,
  StaffSession,
  StaffSignInResult,
  StaffUser,
} from '@/types/staff'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAccessToken, setSession } from '@/api/session'
import { queryClient } from '@/plugins/vue-query'
import { backendCodeOf, errorCodeOf } from '@/services/errors'
import { staffAuthService } from '@/services/staff-auth.service'

// Between a successful password step and a successful MFA step. `enroll` is
// the first sign-in of a role that must use an authenticator app.
export type PendingMfa
  = | ({ kind: 'verify', email: string } & MfaChallenge)
    | ({ kind: 'enroll', email: string } & MfaEnrollment)

// Backend spec 021: a founder's sign-in from a device the Backend does not know yet waits for
// the other founder. No session exists meanwhile; this device polls with `approvalRef`.
export type PendingApproval = DeviceApprovalPending & { email: string }

// How a held sign-in ended without a session.
export type ApprovalEnd = 'refused' | 'ended' | 'frozen'

// A sign-in from a device not yet known, held for the code sent by SMS to the staff phone.
export type PendingDeviceCode = DeviceCodePending & { email: string }

export type LoginOutcome = 'authenticated' | 'mfa_required' | 'mfa_enrollment_required' | 'device_approval_required' | 'device_code_required'

export type SignInOutcome = 'authenticated' | 'device_approval_required' | 'device_code_required'

let initialization: Promise<void> | null = null

export const useAuthStore = defineStore('auth', () => {
  const user = ref<StaffUser | null>(null)
  const pendingMfa = ref<PendingMfa | null>(null)
  const pendingApproval = ref<PendingApproval | null>(null)
  const approvalEnd = ref<ApprovalEnd | null>(null)
  const pendingDeviceCode = ref<PendingDeviceCode | null>(null)
  // Backend spec 021: the email a frozen founder tried to sign in with, for the unfreeze form.
  const frozenEmail = ref<string | null>(null)
  let pollTimer: ReturnType<typeof setTimeout> | null = null
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

  // At least one of these (for example the audit log: everything, or own actions).
  function canAny (permissions: readonly Permission[]): boolean {
    return permissions.some(p => user.value?.permissions.includes(p))
  }

  function startSession (session: StaffSession) {
    stopApprovalPolling()
    pendingMfa.value = null
    pendingApproval.value = null
    approvalEnd.value = null
    pendingDeviceCode.value = null
    setSession(session.tokens)
    user.value = session.staff
  }

  function clearSession () {
    stopApprovalPolling()
    user.value = null
    pendingMfa.value = null
    pendingApproval.value = null
    pendingDeviceCode.value = null
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

  // Re-reads the signed-in profile (roles, permissions) without touching the
  // session, for example after roles changed (Backend spec 002: a change applies
  // on the next request). A failure keeps what is on screen.
  async function refreshProfile (): Promise<void> {
    if (!user.value) {
      return
    }
    try {
      user.value = await staffAuthService.getCurrentStaff()
    } catch {
      // The next navigation re-checks the session anyway.
    }
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
      case 'device_approval_required': {
        holdForApproval(result, email)
        return 'device_approval_required'
      }
      case 'device_code_required': {
        holdForCode(result, email)
        return 'device_code_required'
      }
      default: {
        startSession(result)
        return 'authenticated'
      }
    }
  }

  function finishSignIn (result: StaffSignInResult, email: string): SignInOutcome {
    if (result.status === 'device_approval_required') {
      holdForApproval(result, email)
      return 'device_approval_required'
    }
    if (result.status === 'device_code_required') {
      holdForCode(result, email)
      return 'device_code_required'
    }
    startSession(result)
    return 'authenticated'
  }

  async function verifyMfa (code: string): Promise<SignInOutcome> {
    if (pendingMfa.value?.kind !== 'verify') {
      throw new Error('No verification in progress')
    }
    const email = pendingMfa.value.email
    return finishSignIn(await staffAuthService.verifyMfa({ sessionRef: pendingMfa.value.sessionRef, code }), email)
  }

  async function enrollMfa (code: string): Promise<SignInOutcome> {
    if (pendingMfa.value?.kind !== 'enroll') {
      throw new Error('No enrollment in progress')
    }
    const email = pendingMfa.value.email
    return finishSignIn(await staffAuthService.enrollMfa({ sessionRef: pendingMfa.value.sessionRef, code }), email)
  }

  // ---- Sign-in held for the new-device SMS code ----

  function holdForCode (pending: DeviceCodePending, email: string) {
    stopApprovalPolling()
    pendingMfa.value = null
    pendingApproval.value = null
    pendingDeviceCode.value = { ...pending, email }
  }

  async function verifyDeviceCode (code: string): Promise<void> {
    if (!pendingDeviceCode.value) {
      throw new Error('No device code in progress')
    }
    startSession(await staffAuthService.verifyDeviceCode(pendingDeviceCode.value.challengeId, code))
  }

  async function resendDeviceCode (): Promise<void> {
    const current = pendingDeviceCode.value
    if (!current) {
      throw new Error('No device code in progress')
    }
    pendingDeviceCode.value = { ...(await staffAuthService.resendDeviceCode(current.challengeId)), email: current.email }
  }

  // Back from the code screen to sign in. The Backend challenge simply expires.
  function cancelDeviceCode () {
    pendingDeviceCode.value = null
  }

  // ---- Held founder sign-in (Backend spec 021) ----

  function holdForApproval (pending: DeviceApprovalPending, email: string) {
    stopApprovalPolling()
    pendingMfa.value = null
    approvalEnd.value = null
    pendingApproval.value = {
      approvalId: pending.approvalId,
      approvalRef: pending.approvalRef,
      expiresAt: pending.expiresAt,
      pollIntervalSeconds: pending.pollIntervalSeconds,
      email,
    }
  }

  function stopApprovalPolling () {
    if (pollTimer !== null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  function endApproval (end: ApprovalEnd) {
    stopApprovalPolling()
    approvalEnd.value = end
  }

  // Polls every `pollIntervalSeconds` until the other founder approves (the session starts),
  // refuses, the request ends or expires, the account is frozen, or the user cancels.
  function startApprovalPolling () {
    stopApprovalPolling()
    approvalEnd.value = null
    const pending = pendingApproval.value
    if (!pending) {
      return
    }
    const interval = Math.max(2, pending.pollIntervalSeconds) * 1000

    const tick = async () => {
      pollTimer = null
      const current = pendingApproval.value
      if (!current || current.approvalRef !== pending.approvalRef) {
        return
      }
      if (Date.parse(current.expiresAt) <= Date.now()) {
        endApproval('ended')
        return
      }
      try {
        const result = await staffAuthService.pollDeviceApproval(current.approvalRef)
        if (pendingApproval.value?.approvalRef !== current.approvalRef) {
          return
        }
        if (result.status === 'approved') {
          startSession(result)
          return
        }
      } catch (error) {
        const code = backendCodeOf(error)
        if (code === 'device_approval_refused') {
          return endApproval('refused')
        }
        if (code === 'account_frozen') {
          return endApproval('frozen')
        }
        if (code === 'device_approval_invalid' || code === 'invalid_credentials') {
          return endApproval('ended')
        }
        // A network blip or the poll limit: keep waiting.
      }
      if (pendingApproval.value?.approvalRef === current.approvalRef && approvalEnd.value === null) {
        pollTimer = setTimeout(tick, interval)
      }
    }

    pollTimer = setTimeout(tick, interval)
  }

  // A frozen founder's sign-in (`account_frozen`): the frozen screen offers the first confirmation.
  function markFrozen (email: string | null) {
    stopApprovalPolling()
    pendingMfa.value = null
    pendingApproval.value = null
    frozenEmail.value = email
  }

  // Back from the waiting screen to sign in. The Backend request simply expires.
  function cancelApproval () {
    stopApprovalPolling()
    pendingApproval.value = null
    approvalEnd.value = null
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
    pendingApproval,
    approvalEnd,
    pendingDeviceCode,
    frozenEmail,
    status,
    isAuthenticated,
    isInitializing,
    can,
    canAll,
    canAny,
    initialize,
    refreshProfile,
    login,
    verifyMfa,
    enrollMfa,
    cancelMfa,
    startApprovalPolling,
    stopApprovalPolling,
    cancelApproval,
    verifyDeviceCode,
    resendDeviceCode,
    cancelDeviceCode,
    markFrozen,
    logout,
    startSession,
    clearSession,
  }
})
