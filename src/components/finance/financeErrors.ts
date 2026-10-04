import { accessErrorMessage } from '@/components/staff/accessErrors'
import { formatMoney } from '@/composables/useFormatters'
import { backendCodeOf, isServiceError } from '@/services/errors'

// What a money field accepts (the Backend's rule; it re-checks): more than 0, at most 4 decimal places.
export function amountError (value: string): string | undefined {
  const v = value.trim()
  if (!/^\d{1,12}(?:\.\d{1,4})?$/.test(v)) {
    return 'Write an amount in EGP, for example 800 or 800.50.'
  }
  if (Number(v) <= 0) {
    return 'The amount must be more than 0.'
  }
  return undefined
}

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
export function financeFormError (error: unknown): string {
  if (!error) {
    return ''
  }
  if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) {
    return ''
  }
  return financeErrorMessage(error)
}

// One sentence per Backend refusal on the finance pages (Backend spec 015).
export function financeErrorMessage (error: unknown): string {
  const details = isServiceError(error) ? error.details : {}
  switch (backendCodeOf(error)) {
    case 'compensation_cap_exceeded': {
      const perPayment = typeof details.per_payment === 'string' ? formatMoney(details.per_payment) : null
      const left = typeof details.left_today === 'string' ? formatMoney(details.left_today) : null
      return perPayment && left
        ? `This is over your limit: up to ${perPayment} EGP a payment, ${left} EGP left today.`
        : 'This is over your compensation limit.'
    }
    case 'insufficient_funds': {
      const available = typeof details.available === 'string' ? formatMoney(details.available) : null
      return available ? `The wallet has only ${available} EGP available. A correction can never take it below zero.` : 'There is not enough money in this wallet.'
    }
    case 'verification_required': {
      return 'This customer is not verified, so no money can be paid into their wallet.'
    }
    case 'day_not_ended': {
      return 'This day has not ended yet. It can be closed from midnight.'
    }
    case 'day_already_closed': {
      return 'This day is already closed and locked. It has been refreshed.'
    }
    case 'upload_token_invalid': {
      return 'The proof upload expired. Attach the file again.'
    }
    case 'idempotency_in_progress': {
      return 'The first attempt is still being processed. Wait a moment and try again.'
    }
  }
  return accessErrorMessage(error)
}
