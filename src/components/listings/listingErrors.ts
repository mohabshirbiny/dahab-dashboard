import { accessErrorMessage } from '@/components/staff/accessErrors'
import { backendCodeOf, isServiceError } from '@/services/errors'

// What a decision needs to say (the Backend's rule; it re-checks everything).
export const NOTE_MIN = 10
export const NOTE_MAX = 1000

export function noteError (text: string, what: string): string | undefined {
  const length = text.trim().length
  if (length < NOTE_MIN) {
    return `Write ${what} (at least ${NOTE_MIN} characters). The seller reads it.`
  }
  if (length > NOTE_MAX) {
    return `Keep it under ${NOTE_MAX} characters.`
  }
  return undefined
}

// The banner under a form: nothing when the Backend pointed at fields (those show
// under the fields themselves), otherwise one plain sentence.
export function formLevelError (error: unknown): string {
  if (!error) {
    return ''
  }
  if (isServiceError(error) && error.code === 'validation' && Object.keys(error.fields).length > 0) {
    return ''
  }
  return listingErrorMessage(error)
}

// One sentence per Backend refusal on Listings to review (Backend spec 010).
export function listingErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'illegal_listing_transition': {
      return 'This listing has already been decided or changed by someone else. It has been refreshed.'
    }
    case 'seller_suspended': {
      return 'The seller is suspended, so this piece cannot go live. It stays waiting; you can send it back or reject it.'
    }
    case 'karat_disabled': {
      return 'This karat has been turned off, so the piece cannot go live. It stays waiting; turn the karat on again, send it back or reject it.'
    }
    case 'idempotency_in_progress': {
      return 'The first attempt is still being processed. Wait a moment and try again.'
    }
  }
  return accessErrorMessage(error)
}
