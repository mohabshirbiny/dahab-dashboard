// Backend permission keys. The frontend gates UI on these, never on roles.
export const PERMISSIONS = {
  identityView: 'identity.view',
  identityReview: 'identity.review',
  customerView: 'customer.view',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// The Backend `role` enum (App\Enums\StaffRole).
export type StaffRole = 'ceo' | 'coo' | 'finance' | 'operations' | 'verification' | 'igi_branch'

// Roles are labels only. What a person may do comes from `permissions`.
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ceo: 'Chief Executive Officer',
  coo: 'Chief Operating Officer',
  finance: 'Chief Financial Officer',
  operations: 'Operations',
  verification: 'Verification',
  igi_branch: 'IGI branch',
}

export interface StaffUser {
  id: string
  name: string
  email: string
  role: StaffRole
  // Everything the Backend grants, including keys this UI does not use yet.
  permissions: readonly string[]
}

export interface StaffLoginPayload {
  email: string
  password: string
}

export interface StaffTokens {
  accessToken: string
  refreshToken: string
}

export interface StaffSession {
  tokens: StaffTokens
  staff: StaffUser
}

// Password accepted, and the account has an authenticator app enrolled.
export interface MfaChallenge {
  // Opaque reference that stands in for the password step.
  sessionRef: string
  // ISO timestamp after which the code can no longer be used.
  expiresAt: string
}

// Password accepted, but the role requires an authenticator app and none is enrolled yet.
export interface MfaEnrollment extends MfaChallenge {
  otpauthUrl: string
  recoveryCodes: string[]
}

export type StaffLoginResult
  = | ({ status: 'authenticated' } & StaffSession)
    | ({ status: 'mfa_required' } & MfaChallenge)
    | ({ status: 'mfa_enrollment_required' } & MfaEnrollment)

export interface VerifyMfaPayload {
  sessionRef: string
  code: string
}

export type EnrollMfaPayload = VerifyMfaPayload
