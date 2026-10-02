import { listingErrorMessage } from '@/components/listings/listingErrors'
import { backendCodeOf, isServiceError } from '@/services/errors'

// What a reason needs (the Backend's rule, 10–1000 characters; it re-checks).
export const REASON_MIN = 10
export const REASON_MAX = 1000

export function reasonError (text: string): string | undefined {
  const length = text.trim().length
  if (length < REASON_MIN) {
    return `Write the reason (at least ${REASON_MIN} characters). It is logged with the order.`
  }
  if (length > REASON_MAX) {
    return `Keep it under ${REASON_MAX} characters.`
  }
  return undefined
}

// The banner under a form: nothing when the Backend pointed at fields (those show
// under the fields themselves), otherwise one plain sentence.
export function orderFormError (error: unknown): string {
  if (!error) {
    return ''
  }
  if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) {
    return ''
  }
  return orderErrorMessage(error)
}

// One sentence per Backend refusal on Orders and Inspections (Backend spec 012).
export function orderErrorMessage (error: unknown): string {
  const details = isServiceError(error) ? error.details : {}
  switch (backendCodeOf(error)) {
    case 'illegal_order_transition': {
      return 'This order has already moved on. It has been refreshed.'
    }
    case 'wrong_branch': {
      return 'This order is at another branch. Only staff at that branch can do this.'
    }
    case 'inspection_correction_not_allowed': {
      return 'The result can no longer be corrected: the buyer has already decided or paid.'
    }
    case 'invalid_collection_code': {
      const left = Number(details.attempts_left)
      return Number.isFinite(left)
        ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left before the handover locks for 15 minutes.`
        : 'That code is not right.'
    }
    case 'handover_locked': {
      const seconds = Number(details.retry_after)
      const minutes = Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds / 60)) : 15
      return `Too many wrong codes. The handover is locked; try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
    }
    case 'order_not_open': {
      return 'This order is no longer waiting for delivery, so its branch cannot change.'
    }
    case 'branch_not_in_options': {
      return 'The seller did not offer that branch for this piece. Pick one of their branches.'
    }
    case 'deadline_must_move_forward': {
      return 'The new deadline must be later than the current one, and in the future.'
    }
    case 'deadline_not_running': {
      return 'That deadline is not running for this order now. It has been refreshed.'
    }
    case 'settlement_not_possible': {
      return 'The price cannot be settled for this order. Check the inspection result.'
    }
  }
  return listingErrorMessage(error)
}
