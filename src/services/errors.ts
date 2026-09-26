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

  constructor (code: ServiceErrorCode, message: string, status = 400, fields: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.status = status
    this.fields = fields
  }
}

export function isServiceError (error: unknown): error is ServiceError {
  return error instanceof ServiceError
}

export function errorCodeOf (error: unknown): ServiceErrorCode {
  return isServiceError(error) ? error.code : 'unknown'
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
  forbidden: 'forbidden',
  not_found: 'not_found',
  illegal_document_transition: 'conflict',
  document_image_deleted: 'gone',
  validation_failed: 'validation',
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
  return new ServiceError(code, body?.message ?? error.message, response.status, body?.errors)
}
