import { backendCodeOf, isServiceError } from '@/services/errors'

// What a note and a take-down reason need (the Backend's rules; it re-checks).
export const DISMISS_NOTE_MIN = 3
export const TAKEDOWN_REASON_MIN = 10
export const TEXT_MAX = 1000

export function textError (text: string, min: number, what: string): string | undefined {
  const length = text.trim().length
  if (length < min) {
    return `Write ${what} (at least ${min} characters).`
  }
  if (length > TEXT_MAX) {
    return `Keep it under ${TEXT_MAX} characters.`
  }
  return undefined
}

// One sentence per Backend refusal on listing reports (Backend spec 017).
export function reportErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'report_not_open': {
      return 'This report was already handled. It has been refreshed.'
    }
    case 'illegal_listing_transition': {
      return 'This piece is no longer on the market, so it cannot be taken down here.'
    }
    case 'permission_denied':
    case 'forbidden': {
      return 'Your account does not have permission to do this.'
    }
    case 'not_found': {
      return 'This report does not exist any more.'
    }
    default: {
      return 'Something went wrong. Check your connection and try again.'
    }
  }
}

// The banner under a form: nothing when the Backend pointed at fields, otherwise one sentence.
export function reportFormError (error: unknown): string {
  if (!error) {
    return ''
  }
  if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) {
    return ''
  }
  return reportErrorMessage(error)
}
