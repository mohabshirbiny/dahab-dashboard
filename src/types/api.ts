// Wire shapes of the Dahab Backend (`/api/v1`), exactly as it sends them.
// Verified against the controllers, Resources and a running server.
// The UI never uses these directly: services map them to the camelCase types
// in `src/types/*`.

export interface ApiEnvelope<T> {
  data: T
}

// Laravel's length-aware paginator, wrapped by an API Resource collection.
export interface ApiPageMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface ApiPaginated<T> {
  data: T[]
  meta: ApiPageMeta
}

export interface ApiErrorBody {
  message: string
  // Stable machine-readable value, for example `invalid_credentials`.
  code: string
  // Only on `validation_failed`: field name to messages.
  errors?: Record<string, string[]>
}

export interface ApiSession {
  token_type: 'Bearer'
  access_token: string
  access_token_expires_at: string
  refresh_token: string
  refresh_token_expires_at: string
  family_id: string
}

// A role as shown next to a staff member. Roles are Backend data managed from the
// Dashboard (spec 002), so there is no fixed list of role names here.
export interface ApiRoleRef {
  name: string
  display_name: string
}

export interface ApiStaffProfile {
  id: string
  // Deprecated by the Backend (spec 002): first role name alphabetically, or null.
  // Use `roles_detail`.
  role: string | null
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  // Founder status is read-only; no endpoint can change it.
  is_founder: boolean
  branch_id: number | null
  // Role machine names, sorted.
  roles: string[]
  roles_detail: ApiRoleRef[]
  // Effective permissions (direct and through roles), for example `identity.view`.
  permissions: string[]
  mfa_enrolled: boolean
  created_at: string
}

export interface ApiStaffSignIn {
  staff: ApiStaffProfile
  session: ApiSession
}

// `POST /dashboard/auth/login` answers with one of these three, all under `data`.
export interface ApiMfaChallenge {
  mfa_required: true
  session_ref: string
  expires_at: string
}

export interface ApiMfaEnrollmentPending {
  mfa_enrollment_required: true
  otpauth_url: string
  recovery_codes: string[]
  session_ref: string
  expires_at: string
}

export type ApiLoginData = ApiStaffSignIn | ApiMfaChallenge | ApiMfaEnrollmentPending

export interface ApiMfaEnrolled extends ApiStaffSignIn {
  recovery_codes: string[]
}

export type ApiIdentityDocumentKind = 'egyptian_id' | 'passport'
export type ApiIdentityDocumentStatus = 'pending' | 'verified' | 'needs_resubmission' | 'rejected'
export type ApiCustomerStatus = 'pending_verification' | 'active' | 'rejected' | 'suspended'

export type ApiCustomerType = 'ordinary' | 'market_maker'

// `StaffCustomerVerification`, from `GET /dashboard/customers[/{id}]`. The identity
// document is the one sent with the registration; the images are `/image`.
export interface ApiCustomerVerification {
  id: string
  display_ref: string
  full_name: string | null
  phone: string
  email: string | null
  governorate: string | null
  customer_type: ApiCustomerType
  status: ApiCustomerStatus
  suspended_reason: string | null
  submitted_at: string
  latest_document: {
    document_id: string
    doc_kind: ApiIdentityDocumentKind
    status: ApiIdentityDocumentStatus
    has_back: boolean
    review_reasons: string[] | null
    review_note: string | null
    created_at: string
    reviewed_at: string | null
  } | null
}

// Access control (spec 002). `GET /dashboard/permissions` — the code-defined catalogue.
export interface ApiPermission {
  code: string
  label: string
  group: string
  branch_scoped: boolean
}

// `GET /dashboard/roles`, `GET|PATCH /dashboard/roles/{role}`, `POST /dashboard/roles`.
export interface ApiRole {
  name: string
  display_name: string
  description: string | null
  requires_mfa: boolean
  permissions: string[]
  staff_count: number
  created_at: string
  updated_at: string
}

// `GET /dashboard/staff`, `GET /dashboard/staff/{staff}`, `PUT /dashboard/staff/{staff}/roles`.
export interface ApiStaffMember {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  is_founder: boolean
  branch_id: number | null
  roles: ApiRoleRef[]
  permissions: string[]
  mfa_enrolled: boolean
}

// Reference data (Backend spec 004).
// `GET /dashboard/karats`, `POST /dashboard/karats`, `POST /dashboard/karats/{code}/toggle`.
export interface ApiKarat {
  code: number
  // Decimal string with five places, e.g. "0.87500".
  purity: string
  is_enabled: boolean
  sort_order: number
}

// dow: 0 = Sunday … 6 = Saturday. Times are "HH:MM" in the branch's timezone.
export interface ApiBranchHour {
  dow: number
  opens_at: string
  closes_at: string
}

// `GET|POST /dashboard/branches`, `PATCH /dashboard/branches/{branch}`.
export interface ApiBranch {
  id: number
  name_en: string
  name_ar: string
  address_en: string
  address_ar: string
  timezone: string
  is_enabled: boolean
  hours: ApiBranchHour[]
}

// `GET|POST /dashboard/branch-closures`. branch_id null = every branch.
export interface ApiBranchClosure {
  id: number
  branch_id: number | null
  closure_date: string
  reason_en: string | null
  reason_ar: string | null
}

// Pricing (Backend spec 005). Money is a decimal string with 4 places.
export interface ApiStaffRef {
  id: string
  full_name: string
}

export interface ApiAdjustment {
  kind: 'fixed' | 'percent'
  value: string
}

export interface ApiKaratPrice {
  code: number
  purity: string
  is_enabled: boolean
  market_bid: string
  market_ask: string
  sellers_get: string
  buyers_pay: string
  difference: string
  adjustments: { buy: ApiAdjustment, sell: ApiAdjustment }
  inverted: boolean
}

export interface ApiGoldPrice {
  id: number
  source: 'feed' | 'manual'
  bid_24k: string
  ask_24k: string
  effective_at: string
  entered_by: ApiStaffRef | null
  confirmed_by: ApiStaffRef | null
  reason: string | null
}

export interface ApiManualPrice {
  id: number
  bid_24k: string
  ask_24k: string
  deviation_pct: string | null
  requires_confirmation: boolean
  status: 'pending' | 'effective' | 'superseded' | 'lapsed'
  reason: string
  entered_by: ApiStaffRef
  confirmed_by: ApiStaffRef | null
  confirmed_at: string | null
  expires_at: string | null
  created_at: string
}

// `GET /dashboard/gold-prices/current`
export interface ApiCurrentPrices {
  price: ApiGoldPrice | null
  feed: { state: 'healthy' | 'down' | 'not_configured', last_success_at: string | null, last_failure_at: string | null }
  pending: ApiManualPrice | null
  karats: ApiKaratPrice[]
}

// `POST /dashboard/gold-prices/preview`
export interface ApiPricePreview {
  bid_24k: string
  ask_24k: string
  deviation_pct: string | null
  karats: ApiKaratPrice[]
}

// `GET /dashboard/settings`
export interface ApiSetting {
  key: string
  group: 'rates' | 'operations'
  type: 'numeric' | 'bool'
  value: string | boolean
  unit: string
  description: string
  min: string | null
  max: string | null
  integer: boolean
  updated_by: ApiStaffRef | null
  updated_at: string
}

export interface ApiSettingChange {
  id: number
  key: string
  old_value: string | boolean | null
  new_value: string | boolean
  changed_by: ApiStaffRef
  reason: string
  changed_at: string
}

export interface ApiAdjustmentChange {
  id: number
  karat_code: number
  side: 'buy' | 'sell'
  old: ApiAdjustment
  new: ApiAdjustment
  changed_by: ApiStaffRef
  reason: string
  changed_at: string
}
