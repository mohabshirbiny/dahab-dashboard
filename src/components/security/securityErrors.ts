import { accessErrorMessage } from '@/components/staff/accessErrors'
import { backendCodeOf } from '@/services/errors'

// One sentence per Backend refusal on the Security page (Backend spec 021). The Backend
// re-checks everything; these only explain its answer.
export function securityErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'founder_only': {
      return 'Only a founder can do this.'
    }
    case 'founder_self_action': {
      return 'You cannot do this for your own account.'
    }
    case 'device_approval_not_pending': {
      return 'This request is no longer waiting: it was decided, collected or it expired. The list has been refreshed.'
    }
    case 'freeze_target_invalid': {
      return 'Only the other founder, while active, can be frozen.'
    }
    case 'already_frozen': {
      return 'This account is already frozen. The list has been refreshed.'
    }
    case 'not_frozen': {
      return 'This account is no longer frozen. The list has been refreshed.'
    }
    case 'unfreeze_order': {
      return 'The first confirmation comes first: the frozen founder, or the named stand-in.'
    }
    case 'unfreeze_already_confirmed': {
      return 'This confirmation has already been given.'
    }
    case 'reason_required': {
      return 'Write a reason (at least 5 characters).'
    }
  }
  return accessErrorMessage(error)
}

export const NOTE_MAX = 500
export const REASON_MIN = 5
export const REASON_MAX = 1000

// "a1b2c3d4" → "a1b2 c3d4", easier to read aloud on the phone.
export function formatDeviceRef (ref: string): string {
  return ref.length === 8 ? `${ref.slice(0, 4)} ${ref.slice(4)}` : ref
}
