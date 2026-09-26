import { backendCodeOf, errorCodeOf, isServiceError } from '@/services/errors'

// One sentence per Backend refusal on the access-control screens (Backend spec 002).
// The Backend re-checks everything; these only explain its answer.
export function accessErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'escalation_denied': {
      return 'You can\'t grant or remove access you don\'t hold yourself, or change your own roles.'
    }
    case 'reason_required': {
      return 'Write a short reason (at least 5 characters) for this change.'
    }
    case 'role_in_use': {
      return 'Staff still hold this role. Give them other roles first, then delete it.'
    }
    case 'last_role_manager': {
      return 'Someone active must keep the permission to manage roles.'
    }
    case 'account_frozen': {
      return 'Your account is frozen. Changes are blocked until it is unfrozen.'
    }
  }
  switch (errorCodeOf(error)) {
    case 'forbidden': {
      return 'Your account does not have permission to do this.'
    }
    case 'not_found': {
      return 'This no longer exists. The list has been refreshed.'
    }
    case 'validation': {
      return firstFieldError(error) ?? 'Check the details and try again.'
    }
    case 'too_many_requests': {
      return 'Too many requests. Wait a moment and try again.'
    }
    case 'network': {
      return 'Could not reach the server. Check your connection and try again.'
    }
    default: {
      return 'Something went wrong. Try again.'
    }
  }
}

// Backend validation messages for one field (for example `name`), if any.
export function fieldError (error: unknown, field: string): string | undefined {
  return isServiceError(error) ? error.fields[field]?.[0] : undefined
}

function firstFieldError (error: unknown): string | undefined {
  return isServiceError(error) ? Object.values(error.fields).flat()[0] : undefined
}
