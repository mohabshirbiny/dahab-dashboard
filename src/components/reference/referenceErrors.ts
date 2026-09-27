import { accessErrorMessage } from '@/components/staff/accessErrors'
import { backendCodeOf } from '@/services/errors'

// One sentence per Backend refusal on the reference-data screens (Backend spec 004).
// Everything else reads like the access-control screens.
export function referenceErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'closure_exists': {
      return 'That day is already closed for this branch (or for all branches).'
    }
    case 'closure_in_past': {
      return 'Past closures stay: deadlines were already counted with them.'
    }
  }
  return accessErrorMessage(error)
}
