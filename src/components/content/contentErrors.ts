import { accessErrorMessage } from '@/components/staff/accessErrors'
import { backendCodeOf, isServiceError } from '@/services/errors'

// One sentence per Backend refusal on the App text page (Backend spec 019). The Backend re-checks
// everything; these only explain its answer. Where the Backend's own message names the offending
// placeholder or the limit, it is used as is.
export function contentErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'content_draft_changed': {
      return 'Someone saved this text while you were editing it. Close and reopen it to see their version.'
    }
    case 'content_key_read_only': {
      return 'This text carries a code or a link, so it is shown here but cannot be edited.'
    }
    case 'content_key_retired': {
      return 'The app no longer uses this text.'
    }
    case 'content_language_missing': {
      return 'Both English and Arabic are required.'
    }
    case 'content_unchanged': {
      return 'This is the same as what customers see now, so there is nothing to change.'
    }
    case 'content_nothing_to_publish': {
      return 'There are no drafts to publish.'
    }
    case 'content_no_draft': {
      return 'There is no draft to discard.'
    }
    case 'content_invalid': {
      return 'Some drafts cannot be published. Fix or discard them, then publish again.'
    }
    case 'content_invalid_placeholder':
    case 'content_missing_required_placeholder':
    case 'content_too_long': {
      return isServiceError(error) ? error.message : 'Check the placeholders and the length.'
    }
  }
  return accessErrorMessage(error)
}
