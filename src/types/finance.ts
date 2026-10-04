// Finance operations (Backend spec 015). Money is a 4-place decimal string, as the Backend sends it.

export type CompensationReason = 'igi_delay' | 'dahab_mistake' | 'wasted_trip' | 'dispute_settlement' | 'goodwill'

export const COMPENSATION_REASONS: ReadonlyArray<{ value: CompensationReason, label: string }> = [
  { value: 'igi_delay', label: 'A delay caused by IGI' },
  { value: 'dahab_mistake', label: 'A mistake on Dahab\'s side' },
  { value: 'wasted_trip', label: 'A wasted trip to IGI' },
  { value: 'dispute_settlement', label: 'Settlement of a dispute' },
  { value: 'goodwill', label: 'Goodwill' },
]

export interface Compensation {
  id: string
  paidAt: string
  customer: { id: string, displayRef: string | null, name: string | null }
  party: 'buyer' | 'seller' | null
  amount: string
  reason: CompensationReason
  reasonLabel: string
  note: string
  paidBy: { id: string, name: string | null }
  dispute: { id: string, ref: string | null } | null
  order: { id: string, ref: string | null } | null
}

export interface CompensationCaps {
  perPayment: string
  perDay: string
  uncapped: boolean
  leftToday: string | null
}

export interface CompensationQuery {
  from: string
  to: string
  reason: CompensationReason | ''
  customerId: string | null
}

export interface CompensationPage {
  rows: Compensation[]
  nextCursor: string | null
  totals: { period: string, thisMonth: string }
  caps: CompensationCaps
}

export interface PayCompensationInput {
  customerId: string
  amount: string
  reason: CompensationReason
  note: string
  orderId: string | null
}

export type AdjustmentDirection = 'credit' | 'debit'

export interface WalletAdjustment {
  id: string
  adjustedAt: string
  customer: { id: string, displayRef: string | null, name: string | null }
  direction: AdjustmentDirection
  amount: string
  reason: string
  customerStatus: string
  adjustedBy: { id: string, name: string | null }
}

export type BankMovementKind = 'capital_in' | 'operating_expense' | 'bank_charge' | 'profit_draw' | 'own_transfer' | 'supplier_refund' | 'other'

// The design's list; the usual direction is picked for you, and can be changed.
export const BANK_MOVEMENT_KINDS: ReadonlyArray<{ value: BankMovementKind, label: string, usually: 'in' | 'out' }> = [
  { value: 'capital_in', label: 'Capital paid in', usually: 'in' },
  { value: 'operating_expense', label: 'Operating expense', usually: 'out' },
  { value: 'bank_charge', label: 'Bank charge', usually: 'out' },
  { value: 'profit_draw', label: 'Profit taken out', usually: 'out' },
  { value: 'own_transfer', label: 'Transfer between our own accounts', usually: 'out' },
  { value: 'supplier_refund', label: 'Refund from a supplier', usually: 'in' },
  { value: 'other', label: 'Something else', usually: 'out' },
]

export interface BankMovement {
  id: string
  number: string
  kind: BankMovementKind
  kindLabel: string
  direction: 'in' | 'out'
  amount: string
  occurredOn: string
  reason: string
  hasProof: boolean
  recordedBy: { id: string, name: string | null }
  recordedAt: string
  postsToLedger: boolean
}

export interface BankMovementPage {
  rows: BankMovement[]
  nextCursor: string | null
  totals: { in: string, out: string }
}

export interface RecordBankMovementInput {
  kind: BankMovementKind
  direction: 'in' | 'out'
  amount: string
  occurredOn: string
  reason: string
  proofUploadToken: string | null
}

export type BankBookSource
  = | { type: 'topup', id: string | null, number: string | null, reference: string | null, customerRef: string | null, how: 'matched_notice' | 'credited_by_hand' | null, receivingAccount: string | null }
    | { type: 'withdrawal', id: string, number: string, customerRef: string | null, bankTxnNumber: string | null }
    | { type: 'bank_movement', id: string, number: string, kind: BankMovementKind, kindLabel: string, reason: string, occurredOn: string, hasProof: boolean }
    | { type: 'reversal', reversesTxnId: string | null, memo: string | null }
    | { type: 'other', memo: string | null }

export interface BankBookRow {
  ledgerTxnId: string
  at: string
  kind: string
  direction: 'in' | 'out'
  amount: string
  cashAfter: string
  actor: { type: 'staff' | 'system' | 'customer', name: string | null }
  source: BankBookSource
}

export interface BankBookSummary { opening: string, in: string, out: string, closing: string }

export interface BankBookPage {
  rows: BankBookRow[]
  nextCursor: string | null
  summary: BankBookSummary
}

export interface DayBooks {
  bank: string
  customerAvailable: string
  customerHeld: string
  customerLiability: string
  dahabWallet: string
  escrow: string
  vatPayable: string
  movementsIn: string
  movementsOut: string
}

export interface DailyClose {
  date: string
  bankBalance: string
  booksBank: string
  customerAvailable: string
  customerHeld: string
  customerLiability: string
  dahabWallet: string
  movementsIn: string
  movementsOut: string
  difference: string
  explanation: string | null
  isLocked: boolean
  savedBy: { id: string, name: string | null }
  savedAt: string
  closedBy: { id: string, name: string | null } | null
  closedAt: string | null
}

export interface CloseDay {
  date: string
  ended: boolean
  books: DayBooks
  close: DailyClose | null
  canClose: boolean
}

export interface RecentCloses {
  rows: DailyClose[]
  daysClosed: number
  daysInPeriod: number
  lastDifference: { date: string, difference: string, explanation: string | null } | null
}

export interface ExportResult { blob: Blob, filename: string, truncated: boolean }
