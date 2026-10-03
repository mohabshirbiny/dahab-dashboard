import type { StatusTag } from './status'

// Withdrawals and payout accounts (Backend spec 013). Money stays a 4-place
// decimal string from the Backend; it is formatted for display, never computed with.

export type WithdrawalState = 'requested' | 'under_review' | 'on_hold_account_change' | 'released' | 'settled' | 'rejected' | 'cancelled'
export type PayoutAccountState = 'pending_review' | 'active' | 'refused' | 'removing' | 'removed'

export type WithdrawalHoldReason = 'name_mismatch' | 'account_changed_recently' | 'identity_pending' | 'money_in_straight_out' | 'other'
export type WithdrawalRejectReason = 'account_not_in_name' | 'money_in_straight_out' | 'identity_unconfirmed' | 'customer_request' | 'other'
export type PayoutRefusalReason = 'name_mismatch' | 'name_shortened' | 'not_in_customer_name' | 'details_invalid' | 'other'

export interface StaffRef { id: string, fullName: string }

export interface PayoutAccount {
  id: string
  bankName: string
  accountName: string
  // Full number only for payout_account.verify / withdrawal.release; null otherwise.
  number: string | null
  numberMasked: string
  kind: 'iban' | 'account_number'
  state: PayoutAccountState
  inUse: boolean
  addedAt: string | null
  checked: { by: string | null, at: string } | null
  refusal: { reason: PayoutRefusalReason, note: string | null } | null
  // Only in the "Payout accounts to check" list.
  customer: { id: string, displayRef: string, fullName: string | null, identityVerified: boolean, suspended: boolean } | null
}

export interface WithdrawalSignals {
  identityVerified: boolean
  suspended: boolean
  accountAddedAt: string | null
  firstPayoutToAccount: boolean
  payoutsToAccount: number
  inUseChangedAt: string | null
  completedSales: number
  toppedUpNeverTraded: boolean
}

export interface WithdrawalLedgerEntry {
  id: string
  kind: 'hold' | 'release' | 'return'
  createdAt: string
  lines: Array<{ account: string, amount: string }>
}

export interface Withdrawal {
  id: string
  number: string
  amount: string
  state: WithdrawalState
  requestedAt: string
  reviewStartedAt: string | null
  reviewer: StaffRef | null
  hold: { onHold: boolean, reason: WithdrawalHoldReason, message: string, note: string, by: string | null, at: string } | null
  customer: { id: string, displayRef: string | null, fullName: string | null, available: string }
  account: PayoutAccount | null
  signals: WithdrawalSignals | null
  releasedAt: string | null
  bankTxnNumber: string | null
  transferReference: string | null
  valueDate: string | null
  rejection: { reason: WithdrawalRejectReason, note: string } | null
  cancelledByChange: boolean
  can: { review: boolean, hold: boolean, unhold: boolean, release: boolean, reject: boolean }
  ledger: WithdrawalLedgerEntry[]
}

export interface WithdrawalFigures {
  waitingCount: number
  waitingSum: string
  releasedTodayCount: number
  releasedTodaySum: string
  onHoldCount: number
  avgHoursToRelease: string | null
}

export type WithdrawalScope = 'open' | 'held' | 'released' | 'rejected' | 'cancelled' | 'all'

export interface WithdrawalListQuery {
  scope: WithdrawalScope
  from: string
  to: string
  q: string
  customerId?: string
}

export interface WithdrawalPage {
  rows: Withdrawal[]
  nextCursor: string | null
  figures: WithdrawalFigures
}

export interface PayoutAccountPage {
  rows: PayoutAccount[]
  nextCursor: string | null
  waiting: number
}

export const WITHDRAWAL_STATES: Record<WithdrawalState, StatusTag> = {
  requested: { label: 'Waiting for review', variant: 'wait' },
  under_review: { label: 'Under review', variant: 'info' },
  on_hold_account_change: { label: 'Paused', variant: 'warn' },
  released: { label: 'Released', variant: 'ok' },
  settled: { label: 'Arrived', variant: 'ok' },
  rejected: { label: 'Rejected', variant: 'bad' },
  cancelled: { label: 'Cancelled', variant: 'off' },
}

export function withdrawalStateMeta (w: Pick<Withdrawal, 'state' | 'hold'>): StatusTag {
  if (w.hold?.onHold) {
    return { label: 'On hold', variant: 'warn' }
  }
  return WITHDRAWAL_STATES[w.state] ?? { label: w.state, variant: 'off' }
}

export const PAYOUT_ACCOUNT_STATES: Record<PayoutAccountState, StatusTag> = {
  pending_review: { label: 'Waiting for the name check', variant: 'wait' },
  active: { label: 'Verified', variant: 'ok' },
  refused: { label: 'Refused', variant: 'bad' },
  removing: { label: 'Being removed', variant: 'warn' },
  removed: { label: 'Removed', variant: 'off' },
}

export const HOLD_REASONS: ReadonlyArray<{ value: WithdrawalHoldReason, label: string }> = [
  { value: 'name_mismatch', label: 'Name does not match the ID' },
  { value: 'account_changed_recently', label: 'Bank account changed recently' },
  { value: 'identity_pending', label: 'Waiting for identity verification' },
  { value: 'money_in_straight_out', label: 'Money came in and is going straight out' },
  { value: 'other', label: 'Something else' },
]

export const REJECT_REASONS: ReadonlyArray<{ value: WithdrawalRejectReason, label: string }> = [
  { value: 'account_not_in_name', label: 'The account is not in the customer\'s name' },
  { value: 'money_in_straight_out', label: 'Money in and straight out without trading' },
  { value: 'identity_unconfirmed', label: 'Identity could not be confirmed' },
  { value: 'customer_request', label: 'The customer asked us to stop it' },
  { value: 'other', label: 'Something else' },
]

export const REFUSAL_REASONS: ReadonlyArray<{ value: PayoutRefusalReason, label: string }> = [
  { value: 'name_mismatch', label: 'The name does not match the ID' },
  { value: 'name_shortened', label: 'The name is shortened (ask for the full name)' },
  { value: 'not_in_customer_name', label: 'The account is in someone else\'s name' },
  { value: 'details_invalid', label: 'The account details look wrong' },
  { value: 'other', label: 'Something else' },
]

export function reasonLabel<T extends string> (list: ReadonlyArray<{ value: T, label: string }>, value: T | null | undefined): string {
  return list.find(r => r.value === value)?.label ?? (value ?? '')
}

// Which states each chip asks the Backend for.
export const SCOPE_STATES: Record<WithdrawalScope, WithdrawalState[]> = {
  open: ['requested', 'under_review'],
  held: ['under_review'],
  released: ['released'],
  rejected: ['rejected'],
  cancelled: ['cancelled'],
  all: ['requested', 'under_review', 'released', 'rejected', 'cancelled'],
}
