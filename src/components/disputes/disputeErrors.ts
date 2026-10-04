import { orderErrorMessage } from '@/components/orders/orderErrors'
import { formatMoney } from '@/composables/useFormatters'
import { backendCodeOf, isServiceError } from '@/services/errors'

// What a reply and a note need (the Backend's rules; it re-checks).
export const REPLY_MIN = 10
export const REPLY_MAX = 2000
export const NOTE_MIN = 10
export const NOTE_MAX = 1000

export function lengthError (text: string, min: number, max: number, what: string): string | undefined {
  const length = text.trim().length
  if (length < min) {
    return `Write ${what} (at least ${min} characters).`
  }
  if (length > max) {
    return `Keep it under ${max} characters.`
  }
  return undefined
}

// The banner under a form: nothing when the Backend pointed at fields, otherwise one sentence.
export function disputeFormError (error: unknown): string {
  if (!error) {
    return ''
  }
  if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) {
    return ''
  }
  return disputeErrorMessage(error)
}

// One sentence per Backend refusal on Disputes (Backend spec 014).
export function disputeErrorMessage (error: unknown): string {
  const details = isServiceError(error) ? error.details : {}
  switch (backendCodeOf(error)) {
    case 'illegal_dispute_transition': {
      return 'This dispute has already been resolved. It has been refreshed.'
    }
    case 'dispute_outcome_not_allowed': {
      return 'This order is already paid, so it cannot be cancelled here. Resume it, with compensation if needed.'
    }
    case 'assignee_not_eligible': {
      return 'Pick an active colleague who handles disputes (not yourself).'
    }
    case 'compensation_cap_exceeded': {
      const perPayment = typeof details.per_payment === 'string' ? formatMoney(details.per_payment) : null
      const left = typeof details.left_today === 'string' ? formatMoney(details.left_today) : null
      return perPayment && left
        ? `This is over your limit: up to ${perPayment} EGP a payment, ${left} EGP left today.`
        : 'This is over your compensation limit.'
    }
    case 'permission_denied': {
      return 'You do not have the permission this needs (refund, compensation or suspension).'
    }
    case 'insufficient_funds': {
      return 'The deposit could not be returned: the money is not where it should be. Contact Finance.'
    }
  }
  return orderErrorMessage(error)
}
