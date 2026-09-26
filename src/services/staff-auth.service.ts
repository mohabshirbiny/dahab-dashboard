import type {
  ApiEnvelope,
  ApiLoginData,
  ApiMfaEnrolled,
  ApiSession,
  ApiStaffProfile,
  ApiStaffSignIn,
} from '@/types/api'
import type {
  EnrollMfaPayload,
  StaffLoginPayload,
  StaffLoginResult,
  StaffSession,
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

  // POST /dashboard/auth/mfa/verify
  async verifyMfa (payload: VerifyMfaPayload): Promise<StaffSession> {
    const { data } = await http.post<ApiEnvelope<ApiStaffSignIn>>(
      endpoints.staffMfaVerify,
      { session_ref: payload.sessionRef, code: payload.code },
      AUTH_STEP,
    )
    return toStaffSession(data.data)
  },

  // POST /dashboard/auth/mfa/enroll. Confirms the authenticator app and signs in.
  async enrollMfa (payload: EnrollMfaPayload): Promise<StaffSession> {
    const { data } = await http.post<ApiEnvelope<ApiMfaEnrolled>>(
      endpoints.staffMfaEnroll,
      { session_ref: payload.sessionRef, code: payload.code },
      AUTH_STEP,
    )
    return toStaffSession(data.data)
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
