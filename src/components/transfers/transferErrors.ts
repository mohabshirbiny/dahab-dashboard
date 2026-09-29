import { accessErrorMessage } from '@/components/staff/accessErrors'
import { backendCodeOf, isServiceError } from '@/services/errors'

// The banner under a form: nothing when the Backend pointed at fields (those
// show under the fields themselves), otherwise one plain sentence.
export function formLevelError (error: unknown): string {
  if (!error) {
    return ''
  }
  if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) {
    return ''
  }
  return topUpErrorMessage(error)
}

// Amounts people type: more than 0, at most 2 decimals, at most 99,999,999.99
// (the Backend's rule; it re-checks everything).
export const AMOUNT_PATTERN = /^\d{1,8}(\.\d{1,2})?$/

export function amountError (text: string): string | undefined {
  const value = text.trim().replaceAll(',', '')
  if (!AMOUNT_PATTERN.test(value) || Number(value) <= 0) {
    return 'Enter an amount above 0 with at most 2 decimals, e.g. 19900 or 19900.50.'
  }
  return undefined
}

export function plainAmount (text: string): string {
  return text.trim().replaceAll(',', '')
}

// One sentence per Backend refusal on Incoming transfers (Backend spec 009).
export function topUpErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'illegal_topup_transition': {
      return 'Someone else already closed or changed this transfer. The list has been refreshed.'
    }
    case 'verification_required': {
      return 'This customer is not verified (waiting or rejected), so money cannot be credited to them.'
    }
    case 'idempotency_in_progress': {
      return 'The first attempt is still being processed. Wait a moment and try again.'
    }
  }
  return accessErrorMessage(error)
}
