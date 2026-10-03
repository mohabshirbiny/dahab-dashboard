import { accessErrorMessage } from '@/components/staff/accessErrors'
import { backendCodeOf, isServiceError } from '@/services/errors'

// The banner under a form: nothing when the Backend pointed at fields (those
// show under the fields themselves), otherwise one plain sentence.
export function withdrawalFormError (error: unknown): string {
  if (!error) {
    return ''
  }
  if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) {
    return ''
  }
  return withdrawalErrorMessage(error)
}

// One sentence per Backend refusal on Withdrawals (Backend spec 013).
export function withdrawalErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'illegal_withdrawal_transition': {
      return 'Someone else already moved this withdrawal, or the customer cancelled it. It has been refreshed.'
    }
    case 'withdrawal_on_hold': {
      return 'This withdrawal is on hold. Remove the hold before releasing it.'
    }
    case 'payout_account_not_active': {
      return 'The customer\'s account can no longer receive money. Reject the withdrawal so the money goes back.'
    }
    case 'illegal_payout_account_transition': {
      return 'This account has already been checked or removed. The list has been refreshed.'
    }
    case 'idempotency_in_progress': {
      return 'The first attempt is still being processed. Wait a moment and try again.'
    }
  }
  return accessErrorMessage(error)
}

// Staff notes and messages: the Backend's rules (it re-checks).
export function textError (text: string, min: number, max: number, what: string): string | undefined {
  const length = text.trim().length
  if (length < min) {
    return `Write ${what} (at least ${min} characters).`
  }
  if (length > max) {
    return `Keep it under ${max} characters.`
  }
  return undefined
}
