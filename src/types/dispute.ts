// Disputes (Backend spec 014, contracts/disputes-api.md): a party's complaint on an
// order. Opening one freezes the order (state `disputed`); staff pass it on or resolve
// it, always with a reply to the customer who raised it. Money is a 4-place decimal
// string from the Backend; the UI never computes with it.
import type { OrderDetail, OrderState } from './order'
import type { StatusVariant } from './status'
import type { Money } from './wallet'

export type DisputeState = 'open' | 'passed_on' | 'resolved'
export type DisputeOutcome = 'resume' | 'against_sale'
export type DisputeFilter = 'unresolved' | DisputeState

export type DisputeReason
  = | 'not_as_listed'
    | 'disagree_inspection'
    | 'money_wrong'
    | 'other_side_unresponsive'
    | 'not_theirs_to_sell'
    | 'other'

export type CompensationReason = 'igi_delay' | 'dahab_mistake' | 'wasted_trip' | 'dispute_settlement' | 'goodwill'

// The fixed suspension reasons staff choose from (Backend SuspendedReason::staffChoices).
export type SuspendReason
  = | 'piece_misrepresented'
    | 'off_platform_dealing'
    | 'repeated_disputes'
    | 'reported_by_users'
    | 'identity_unconfirmed'
    | 'customer_request'
    | 'other'

export const DISPUTE_STATE_META: Record<DisputeState, { label: string, variant: StatusVariant }> = {
  open: { label: 'Open', variant: 'bad' },
  passed_on: { label: 'Passed on', variant: 'warn' },
  resolved: { label: 'Resolved', variant: 'ok' },
}

export function disputeStateMeta (state: string): { label: string, variant: StatusVariant } {
  return DISPUTE_STATE_META[state as DisputeState] ?? { label: state.replaceAll('_', ' '), variant: 'info' }
}

export const OUTCOME_LABELS: Record<DisputeOutcome, string> = {
  resume: 'Resumed',
  against_sale: 'Cancelled and refunded',
}

export const COMPENSATION_REASONS: ReadonlyArray<{ value: CompensationReason, label: string }> = [
  { value: 'igi_delay', label: 'A delay caused by IGI' },
  { value: 'dahab_mistake', label: 'A mistake on Dahab\'s side' },
  { value: 'wasted_trip', label: 'A wasted trip to IGI' },
  { value: 'dispute_settlement', label: 'Settlement of a dispute' },
  { value: 'goodwill', label: 'Goodwill' },
]

export const SUSPEND_REASONS: ReadonlyArray<{ value: SuspendReason, label: string }> = [
  { value: 'piece_misrepresented', label: 'A piece was not what they said it was' },
  { value: 'off_platform_dealing', label: 'Tried to deal outside Dahab' },
  { value: 'repeated_disputes', label: 'Repeated disputes against them' },
  { value: 'reported_by_users', label: 'Reported by other users' },
  { value: 'identity_unconfirmed', label: 'Identity could not be confirmed' },
  { value: 'customer_request', label: 'They asked us to close it' },
  { value: 'other', label: 'Something else' },
]

// The design's ready-made replies; staff may write their own.
export const CANNED_REPLIES: ReadonlyArray<{ label: string, text: string }> = [
  { label: 'Re-weigh requested', text: 'We have asked IGI to weigh the piece again. We will tell you the result as soon as we have it.' },
  { label: 'Inspection result stands', text: 'We checked the inspection with IGI and the result stands. The order is moving again.' },
  { label: 'Resolved in your favour', text: 'We looked into it and agree with you. We have put it right on this order.' },
  { label: 'Cancelled and refunded', text: 'The piece was not what the listing said. The sale is cancelled and your deposit is back in your wallet.' },
  { label: 'Nothing found', text: 'We looked into it carefully and found nothing wrong with this order. It is moving again.' },
]

export interface DisputeParty { customerId: string, displayRef: string | null }
export interface StaffRef { staffId: string, name: string | null }

// A row of the queue.
export interface Dispute {
  id: string
  ref: string
  order: { id: string, ref: string | null, state: OrderState | null, frozenFrom: OrderState }
  reason: DisputeReason | (string & {})
  reasonLabel: string
  raisedAs: 'buyer' | 'seller'
  raisedBy: DisputeParty
  state: DisputeState
  assignedTo: StaffRef | null
  openedAt: string
  ageSeconds: number
  outcome: DisputeOutcome | null
}

export interface DisputeHistoryEntry {
  kind: 'opened' | 'passed_on' | 'resolved' | (string & {})
  by: { type: 'customer', role: 'buyer' | 'seller' } | { type: 'staff', staffId: string, name: string | null }
  assignedTo: StaffRef | null
  note: string | null
  at: string
}

export interface DisputeCompensation {
  party: 'buyer' | 'seller'
  amount: Money
  reason: CompensationReason | (string & {})
  note: string
  paidBy: StaffRef
  paidAt: string
}

// What the signed-in person may do now — the Backend decides (state and codes).
export interface DisputeCan {
  passOn: boolean
  resolveResume: boolean
  resolveAgainstSale: boolean
  compensate: boolean
  suspendSeller: boolean
  // Null when the caller pays above the caps (compensation.uncapped) or cannot pay.
  compensationCaps: { perPayment: Money, leftToday: Money } | null
}

export interface DisputeDetail extends Omit<Dispute, 'order'> {
  order: OrderDetail & { frozenFrom: OrderState }
  detail: string
  photos: Array<{ id: string, mime: string, position: number }>
  history: DisputeHistoryEntry[]
  reply: string | null
  resolvedBy: StaffRef | null
  resolvedAt: string | null
  compensations: DisputeCompensation[]
  can: DisputeCan
}

export interface DisputePage {
  rows: Dispute[]
  nextCursor: string | null
  counts: { open: number, passedOn: number }
}

export interface DisputeAssignee { id: string, name: string, roles: string[] }

export interface ResolveInput {
  outcome: DisputeOutcome
  reply: string
  compensation: { party: 'buyer' | 'seller', amount: string, reason: CompensationReason, note: string } | null
  suspendSeller: { reason: SuspendReason, note: string | null } | null
}
