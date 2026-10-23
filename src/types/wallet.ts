// Wallets (Backend spec 008). Money is a 4-place decimal string from the Backend
// ("56760.0000"); the UI formats it for display and never computes with it.

export type Money = string

export interface WalletOverview {
  available: Money
  held: Money
  // Backend spec 013: held = heldOnOrders + pendingWithdrawals.
  heldOnOrders: Money
  pendingWithdrawals: Money
  totalOwed: Money
  // The cash in the bank (always shown as a positive figure).
  bank: Money
  // bank − totalOwed. Negative means customer money is short.
  headroom: Money
  // The sum of every ledger line; must be "0.0000".
  systemTotal: Money
}

export interface CustomerWallet {
  available: Money
  held: Money
  heldOnOrders: Money
  pendingWithdrawals: Money
  total: Money
}

export type StatementView = 'customer' | 'customers' | 'dahab'
export type StatementGrain = 'each' | 'day' | 'month'

export interface StatementQuery {
  view: StatementView
  customerId: string | null
  from: string
  to: string
  grain: StatementGrain
}

export interface StatementSummary {
  view: StatementView
  from: string
  to: string
  opening: Money
  in: Money
  out: Money
  closing: Money
  // view = customer
  available?: Money
  held?: Money
  total?: Money
  customer?: { id: string, displayRef: string, fullName: string | null }
  // view = dahab
  vatPayable?: Money
  // view = dahab: commission and spread apart (their ins add up to `in`, their outs to `out`).
  commissionIn?: Money
  commissionOut?: Money
  spreadIn?: Money
  spreadOut?: Money
  // view = dahab: the period's VAT on the commission — owed, not earned, so not in `in`/`out`.
  vatIn?: Money
  vatOut?: Money
  // view = dahab: the first-sale advance (spec 023) paid to sellers and recovered at the settlement —
  // Dahab's money fronted, not earned, so not in `in`/`out`.
  advanceOut?: Money
  advanceBack?: Money
}

export interface StatementActor {
  type: 'customer' | 'staff' | 'system'
  name: string | null
}

// One ledger entry (grain = each).
export interface StatementMovement {
  kind: 'movement'
  id: string
  createdAt: string
  eventKind: string
  label: string
  reference: string | null
  memo: string | null
  byHand: boolean
  actor: StatementActor
  before: Money
  in: Money
  out: Money
  after: Money
  heldAfter: Money | null
  wallet: { customerId: string, displayRef: string } | null
  movedToHeld: Money | null
  // view = dahab only (null otherwise): signed, commission + spread = in − out.
  commission: Money | null
  spread: Money | null
  // view = dahab only: the entry's VAT payable change, outside the balance.
  vat: Money | null
  // view = dahab only: the first-sale advance, signed (− paid to a seller, + recovered), outside the balance.
  advance: Money | null
}

// One day or month (grain = day | month).
export interface StatementPeriod {
  kind: 'period'
  period: string
  count: number
  before: Money
  in: Money
  out: Money
  after: Money
  commission: Money | null
  spread: Money | null
  vat: Money | null
  advance: Money | null
}

export type StatementRow = StatementMovement | StatementPeriod

export interface StatementPage {
  summary: StatementSummary
  rows: StatementRow[]
  nextCursor: string | null
}
