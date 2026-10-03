import type { ApiErrorBody } from '@/types/api'
import { isAxiosError } from 'axios'

// One error shape for every service call. The UI reads `code`, never the
// message text or HTTP details.
export type ServiceErrorCode
  = | 'invalid_credentials'
    | 'account_disabled'
    | 'mfa_invalid'
    | 'mfa_expired'
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'gone'
    | 'validation'
    | 'too_many_requests'
    | 'network'
    | 'unknown'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  readonly status: number
  // Backend validation messages by field name, on `validation` only.
  readonly fields: Readonly<Record<string, string[]>>
  // The Backend's own `code`, for screens that must tell apart refusals that share
  // a UI code (for example `escalation_denied` vs `permission_denied`). Null when
  // the failure did not come from the Backend.
  readonly backendCode: string | null
  // The Backend's optional `details` (for example `attempts_left`, `retry_after`).
  readonly details: Readonly<Record<string, unknown>>

  constructor (code: ServiceErrorCode, message: string, status = 400, fields: Record<string, string[]> = {}, backendCode: string | null = null, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.status = status
    this.fields = fields
    this.backendCode = backendCode
    this.details = details
  }
}

export function isServiceError (error: unknown): error is ServiceError {
  return error instanceof ServiceError
}

export function errorCodeOf (error: unknown): ServiceErrorCode {
  return isServiceError(error) ? error.code : 'unknown'
}

export function backendCodeOf (error: unknown): string | null {
  return isServiceError(error) ? error.backendCode : null
}

// The Backend's stable `code` values (AuthErrorCode and DomainApiException)
// mapped to the codes the UI knows. Anything unlisted falls back on the HTTP status.
const BACKEND_CODES: Readonly<Record<string, ServiceErrorCode>> = {
  invalid_credentials: 'invalid_credentials',
  account_frozen: 'account_disabled',
  account_suspended: 'account_disabled',
  account_locked: 'too_many_requests',
  too_many_requests: 'too_many_requests',
  mfa_invalid: 'mfa_invalid',
  unauthenticated: 'unauthenticated',
  token_invalid: 'unauthenticated',
  token_expired: 'unauthenticated',
  refresh_invalid: 'unauthenticated',
  permission_denied: 'forbidden',
  // Access control (Backend spec 002).
  escalation_denied: 'forbidden',
  verification_required: 'forbidden',
  role_in_use: 'conflict',
  last_role_manager: 'conflict',
  reason_required: 'validation',
  // Reference data (Backend spec 004).
  closure_exists: 'conflict',
  closure_in_past: 'conflict',
  // Pricing (Backend spec 005).
  no_gold_price: 'conflict',
  price_feed_healthy: 'conflict',
  manual_price_not_pending: 'conflict',
  confirmer_must_differ: 'forbidden',
  price_inverted: 'validation',
  forbidden: 'forbidden',
  not_found: 'not_found',
  illegal_document_transition: 'conflict',
  document_image_deleted: 'gone',
  validation_failed: 'validation',
  // Customer file (Backend spec 007).
  customer_already_suspended: 'conflict',
  customer_not_suspended: 'conflict',
  idempotency_in_progress: 'conflict',
  idempotency_key_mismatch: 'validation',
  idempotency_key_required: 'validation',
  // Wallet top-up (Backend spec 009).
  illegal_topup_transition: 'conflict',
  // Orders (Backend spec 012).
  illegal_order_transition: 'conflict',
  wrong_branch: 'forbidden',
  inspection_correction_not_allowed: 'conflict',
  invalid_collection_code: 'validation',
  handover_locked: 'too_many_requests',
  order_not_open: 'conflict',
  branch_not_in_options: 'conflict',
  deadline_must_move_forward: 'validation',
  deadline_not_running: 'conflict',
  // Withdrawals (Backend spec 013).
  illegal_withdrawal_transition: 'conflict',
  illegal_payout_account_transition: 'conflict',
  withdrawal_on_hold: 'conflict',
  payout_account_not_active: 'conflict',
  withdrawals_paused: 'conflict',
  insufficient_funds: 'conflict',
}

const STATUS_CODES: Readonly<Record<number, ServiceErrorCode>> = {
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  410: 'gone',
  422: 'validation',
  429: 'too_many_requests',
}

function isBackendBody (value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && typeof (value as ApiErrorBody).code === 'string'
}

// Turns whatever a request threw into a ServiceError. Only the API client
// calls this, so services and components never see an AxiosError.
export function toServiceError (error: unknown): ServiceError {
  if (isServiceError(error)) {
    return error
  }
  if (!isAxiosError(error)) {
    return new ServiceError('unknown', error instanceof Error ? error.message : 'Unexpected error', 0)
  }
  const response = error.response
  if (!response) {
    return new ServiceError('network', error.message, 0)
  }
  const body = isBackendBody(response.data) ? response.data : null
  const code = (body && BACKEND_CODES[body.code]) ?? STATUS_CODES[response.status] ?? 'unknown'
  return new ServiceError(code, body?.message ?? error.message, response.status, body?.errors, body?.code ?? null, body?.details ?? {})
}
