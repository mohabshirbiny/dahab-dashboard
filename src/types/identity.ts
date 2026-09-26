// The identity document is the one sent with a customer's registration. It is never
// listed on its own: staff reach it from the customer's file (`types/customer.ts`).

export type IdentityDocumentType = 'egyptian_id' | 'passport'
export type IdentityDocumentStatus = 'pending' | 'verified' | 'needs_resubmission' | 'rejected'
export type IdentityDocumentSide = 'front' | 'back'

export const IDENTITY_TYPE_LABELS: Record<IdentityDocumentType, string> = {
  egyptian_id: 'Egyptian ID',
  passport: 'Passport',
}

// What a reviewer can say is wrong with a document. The values are the Backend enum
// (App\Enums\IdentityReviewReason); the labels are the design's checkboxes.
export const IDENTITY_REVIEW_REASONS = [
  { value: 'blurred_or_glare', label: 'Blurred or glare' },
  { value: 'card_cut_off', label: 'Card is cut off' },
  { value: 'name_does_not_match', label: 'Name does not match' },
  { value: 'card_expired', label: 'Card has expired' },
  { value: 'back_missing', label: 'Back is missing' },
  { value: 'text_not_readable', label: 'Text is not readable' },
] as const

export type IdentityReviewReason = typeof IDENTITY_REVIEW_REASONS[number]['value']

const REASON_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  IDENTITY_REVIEW_REASONS.map(reason => [reason.value, reason.label]),
)

// A reason the UI does not know yet is shown as the Backend sent it, never dropped.
export function reasonLabel (value: string): string {
  return REASON_LABELS[value] ?? value
}

// The three outcomes of `POST /dashboard/identity-documents/{id}/review`.
export type IdentityReviewAction = 'verify' | 'request_resubmission' | 'reject'

export interface IdentityReviewInput {
  action: IdentityReviewAction
  // Required for `request_resubmission` and `reject`, ignored for `verify`.
  reasons: IdentityReviewReason[]
  note: string
}

// What the decision panel needs to know about a document.
export interface IdentityReviewTarget {
  id: string
  type: IdentityDocumentType
  status: IdentityDocumentStatus
  customerRef: string
  reviewedAt: string | null
  reviewReasons: string[]
  reviewNote: string | null
}
