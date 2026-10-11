import type {
  ApiDeviceApprovalPending,
  ApiDeviceApprovalStatus,
  ApiEnvelope,
  ApiFrozenConfirmUnfreeze,
  ApiLoginData,
  ApiMfaEnrollData,
  ApiMfaVerifyData,
  ApiSession,
  ApiStaffProfile,
  ApiStaffSignIn,
} from '@/types/api'
import type { FrozenConfirmPayload } from '@/types/security'
import type {
  DeviceApprovalPending,
  DeviceApprovalPoll,
  EnrollMfaPayload,
  StaffLoginPayload,
  StaffLoginResult,
  StaffSession,
  StaffSignInResult,
  StaffTokens,
  StaffUser,
  VerifyMfaPayload,
} from '@/types/staff'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

function toTokens (session: ApiSession): StaffTokens {
  return { accessToken: session.access_token, refreshToken: session.refresh_token }
}

function toStaffUser (profile: ApiStaffProfile): StaffUser {
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    roles: profile.roles_detail.map(role => ({ name: role.name, displayName: role.display_name })),
    isFounder: profile.is_founder,
    permissions: profile.permissions,
  }
}

function toStaffSession (data: ApiStaffSignIn): StaffSession {
  return { tokens: toTokens(data.session), staff: toStaffUser(data.staff) }
}

function toPending (data: ApiDeviceApprovalPending): DeviceApprovalPending {
  return {
    approvalId: data.approval_id,
    approvalRef: data.approval_ref,
    expiresAt: data.expires_at,
    pollIntervalSeconds: data.poll_interval_seconds,
  }
}

// The MFA step ends in a session, or (Backend spec 021) a founder's new device held for approval.
function toSignInResult (data: ApiMfaVerifyData | ApiMfaEnrollData): StaffSignInResult {
  if ('device_approval_required' in data) {
    return { status: 'device_approval_required', ...toPending(data) }
  }
  return { status: 'authenticated', ...toStaffSession(data) }
}

// Sign-in, MFA and refresh answer 401 for wrong input. That is an answer to show,
// not an expired session, so they never trigger a token refresh.
const AUTH_STEP = { skipAuthRefresh: true } as const

export const staffAuthService = {
  // POST /dashboard/auth/login. The Backend answers with a session, an MFA challenge,
  // or an MFA enrollment payload; founders and anyone holding a role flagged
  // `requires_mfa` always go through MFA (Backend spec 002).
  async login (payload: StaffLoginPayload): Promise<StaffLoginResult> {
    const { data } = await http.post<ApiEnvelope<ApiLoginData>>(endpoints.staffLogin, payload, AUTH_STEP)
    const result = data.data
    if ('session' in result) {
      return { status: 'authenticated', ...toStaffSession(result) }
    }
    // Only when MFA is switched off locally: a founder's new device is held at the password step.
    if ('device_approval_required' in result) {
      return { status: 'device_approval_required', ...toPending(result) }
    }
    if ('mfa_enrollment_required' in result) {
      return {
        status: 'mfa_enrollment_required',
        sessionRef: result.session_ref,
        expiresAt: result.expires_at,
        otpauthUrl: result.otpauth_url,
        recoveryCodes: result.recovery_codes,
      }
    }
    return { status: 'mfa_required', sessionRef: result.session_ref, expiresAt: result.expires_at }
  },

  // POST /dashboard/auth/mfa/verify. A founder on a device the Backend does not know yet gets
  // no session: `device_approval_required` (Backend spec 021).
  async verifyMfa (payload: VerifyMfaPayload): Promise<StaffSignInResult> {
    const { data } = await http.post<ApiEnvelope<ApiMfaVerifyData>>(
      endpoints.staffMfaVerify,
      { session_ref: payload.sessionRef, code: payload.code },
      AUTH_STEP,
    )
    return toSignInResult(data.data)
  },

  // POST /dashboard/auth/mfa/enroll. Confirms the authenticator app and signs in, or holds a
  // founder's new device for approval (the enrollment is stored either way).
  async enrollMfa (payload: EnrollMfaPayload): Promise<StaffSignInResult> {
    const { data } = await http.post<ApiEnvelope<ApiMfaEnrollData>>(
      endpoints.staffMfaEnroll,
      { session_ref: payload.sessionRef, code: payload.code },
      AUTH_STEP,
    )
    return toSignInResult(data.data)
  },

  // POST /dashboard/auth/device-approval/status (Backend spec 021). Pending, or the session once
  // the other founder approved (first poll only). Refused → `device_approval_refused` (403);
  // ended → `device_approval_invalid` (401); frozen meanwhile → `account_frozen`.
  async pollDeviceApproval (approvalRef: string): Promise<DeviceApprovalPoll> {
    const { data } = await http.post<ApiEnvelope<ApiDeviceApprovalStatus>>(
      endpoints.staffDeviceApprovalStatus,
      { approval_ref: approvalRef },
      AUTH_STEP,
    )
    const result = data.data
    if (result.status === 'pending') {
      return { status: 'pending', expiresAt: result.expires_at }
    }
    return { status: 'approved', ...toStaffSession(result) }
  },

  // POST /dashboard/auth/frozen/confirm-unfreeze (Backend spec 021): the frozen founder's first
  // unfreeze confirmation, from a device known for them. No session is ever issued.
  async confirmUnfreezeAsFrozen (payload: FrozenConfirmPayload): Promise<ApiFrozenConfirmUnfreeze> {
    const body = {
      email: payload.email,
      password: payload.password,
      ...(payload.recoveryCode ? { recovery_code: payload.recoveryCode } : { code: payload.code }),
      ...(payload.note ? { note: payload.note } : {}),
    }
    const { data } = await http.post<ApiEnvelope<ApiFrozenConfirmUnfreeze>>(endpoints.staffFrozenConfirmUnfreeze, body, AUTH_STEP)
    return data.data
  },

  // POST /dashboard/auth/password/reset-request (Backend spec 020). Always 202 with the same
  // message, so the page never learns whether the address is a staff account.
  async requestPasswordReset (email: string): Promise<void> {
    await http.post(endpoints.staffPasswordResetRequest, { email }, AUTH_STEP)
  },

  // POST /dashboard/auth/password/reset-confirm. No session is issued: the member signs in
  // afterwards, with the authenticator when one is enrolled. `reset_link_invalid` (422)
  // covers an unknown, used, expired or disabled-member link.
  async confirmPasswordReset (token: string, password: string, passwordConfirmation: string): Promise<void> {
    await http.post(
      endpoints.staffPasswordResetConfirm,
      { token, password, password_confirmation: passwordConfirmation },
      AUTH_STEP,
    )
  },

  // POST /dashboard/auth/logout: revokes this access token and its refresh token (204).
  async logout (): Promise<void> {
    await http.post(endpoints.staffLogout)
  },

  // GET /dashboard/auth/me, authorised by the Bearer token the client adds.
  async getCurrentStaff (): Promise<StaffUser> {
    const { data } = await http.get<ApiEnvelope<ApiStaffProfile>>(endpoints.staffMe)
    return toStaffUser(data.data)
  },
}
