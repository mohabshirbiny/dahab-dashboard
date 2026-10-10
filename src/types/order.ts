// Orders (Backend spec 012, contracts/orders-api.md): a sale's life after the seller
// accepted a buyer — delivery to the branch, inspection, the balance, collection, and
// the return of a piece to its seller. Money is a 4-place decimal string and weight a
// 3-place one from the Backend; the UI formats them and never computes with them.
// Buyer and seller by display reference only (and id, to open the Customer file).
import type { ListingCategory, ListingState } from './listing'
import type { StatusVariant } from './status'
import type { Money } from './wallet'

export type KnownOrderState
  = | 'awaiting_delivery'
    | 'at_inspection'
    | 'inspection_passed'
    | 'weight_adjust_pending'
    | 'awaiting_balance'
    | 'ready_to_collect'
    | 'completed'
    | 'cancelled_seller'
    | 'cancelled_buyer_nopay'
    | 'cancelled_inspection'
    | 'disputed'
    | 'cancelled_staff'
export type OrderState = KnownOrderState | (string & {})

// The Backend's groups (GET /dashboard/orders?group=…). `returns` is a returned piece
// still waiting for its seller; `closed` every final state.
export type OrderGroup = 'open' | 'waiting_seller' | 'at_igi' | 'needs_decision' | 'waiting_balance' | 'ready_to_collect' | 'returns' | 'closed' | 'all'

export type InspectionOutcome = 'pass' | 'weight_adjust' | 'stone_regrade' | 'karat_cancel' | 'fake_cancel'
export type DeadlineKind = 'reach_branch' | 'decision' | 'balance' | 'collect' | 'return' | (string & {})
export type ExtendableDeadline = 'reach_branch' | 'balance' | 'collect'

const STATE_META: Record<KnownOrderState, { label: string, variant: StatusVariant }> = {
  awaiting_delivery: { label: 'Waiting for the seller', variant: 'wait' },
  at_inspection: { label: 'At IGI', variant: 'info' },
  inspection_passed: { label: 'Inspection passed', variant: 'info' },
  weight_adjust_pending: { label: 'Buyer deciding', variant: 'warn' },
  awaiting_balance: { label: 'Waiting for the balance', variant: 'wait' },
  ready_to_collect: { label: 'Ready to collect', variant: 'ok' },
  completed: { label: 'Completed', variant: 'ok' },
  cancelled_seller: { label: 'Cancelled by the seller', variant: 'off' },
  cancelled_buyer_nopay: { label: 'Buyer did not pay', variant: 'bad' },
  cancelled_inspection: { label: 'Cancelled at inspection', variant: 'bad' },
  disputed: { label: 'Dispute open', variant: 'bad' },
  cancelled_staff: { label: 'Cancelled by Dahab', variant: 'off' },
}

export function orderStateMeta (state: OrderState): { label: string, variant: StatusVariant } {
  return STATE_META[state as KnownOrderState] ?? { label: state.replaceAll('_', ' '), variant: 'info' }
}

export const OUTCOME_META: Record<InspectionOutcome, { label: string, variant: StatusVariant }> = {
  pass: { label: 'Passed', variant: 'ok' },
  weight_adjust: { label: 'Weight differs', variant: 'warn' },
  stone_regrade: { label: 'Stone lower', variant: 'warn' },
  karat_cancel: { label: 'Karat wrong', variant: 'bad' },
  fake_cancel: { label: 'Not genuine', variant: 'bad' },
}

export function outcomeMeta (outcome: string): { label: string, variant: StatusVariant } {
  return OUTCOME_META[outcome as InspectionOutcome] ?? { label: outcome.replaceAll('_', ' '), variant: 'info' }
}

export const DEADLINE_LABELS: Record<string, string> = {
  reach_branch: 'Reach the branch',
  decision: 'Buyer decides',
  balance: 'Pay the balance',
  collect: 'Collect',
  return: 'Seller collects the piece',
}

export const EXTENDABLE_DEADLINES: ReadonlyArray<{ value: ExtendableDeadline, label: string }> = [
  { value: 'reach_branch', label: 'Reach the branch (seller)' },
  { value: 'balance', label: 'Pay the balance (buyer)' },
  { value: 'collect', label: 'Collect the piece (buyer)' },
]

// Spec 018 (Backend): the buyer's offer to relist a collected piece at 0% commission, within
// working hours of the handover. Staff only read it; they never create or change an offer.
export type FreeRelistStatus = 'none' | 'open' | 'used' | 'expired'
export type FreeRelistFilter = 'open' | 'used' | 'expired'

export const FREE_RELIST_META: Record<FreeRelistStatus, { label: string, variant: StatusVariant }> = {
  none: { label: 'No offer', variant: 'off' },
  open: { label: 'Offer open', variant: 'ok' },
  used: { label: 'Relisted', variant: 'info' },
  expired: { label: 'Offer expired', variant: 'off' },
}

export function freeRelistMeta (status: string): { label: string, variant: StatusVariant } {
  return FREE_RELIST_META[status as FreeRelistStatus] ?? { label: status.replaceAll('_', ' '), variant: 'info' }
}

export interface FreeRelist {
  status: FreeRelistStatus
  endsAt: string | null
  listing: { id: string, title: string | null } | null
}

// Spec 018: one party's rating of the experience with Dahab. Only with `rating.view`.
export interface OrderRating {
  partyRole: 'buyer' | 'seller'
  stars: number
  note: string | null
  createdAt: string
}

export interface OrderParty { customerId: string, displayRef: string | null }

export interface OrderPiece {
  listingId: string
  category: ListingCategory
  pieceType: { id: number, nameEn: string | null }
  karat: number | null
  weightG: string | null
  listingState: ListingState
}

export interface OrderDeadline { kind: DeadlineKind, at: string, overdue: boolean }

export interface Order {
  id: string
  orderRef: string
  state: OrderState
  group: string
  listingState: ListingState
  piece: OrderPiece
  seller: OrderParty
  buyer: OrderParty
  branch: { id: number | null, nameEn: string | null }
  value: Money
  held: Money
  paid: Money | null
  deadline: OrderDeadline | null
  acceptedAt: string
  // Spec 014: frozen by a dispute; a seller's request for more time waiting for an answer.
  frozen: boolean
  hasWaitingExtension: boolean
  // Spec 018: null when the Backend sends none.
  freeRelistStatus: FreeRelistStatus | null
}

// A seller's request for more time (Backend spec 014): staff accept with 6, 12, 24 or 48
// working hours, or refuse; it lapses when the order moves on.
export type ExtensionRequestState = 'waiting' | 'accepted' | 'refused' | 'lapsed'
export type ExtensionHours = 6 | 12 | 24 | 48
export const EXTENSION_HOURS: ReadonlyArray<ExtensionHours> = [6, 12, 24, 48]

export const EXTENSION_STATE_META: Record<ExtensionRequestState, { label: string, variant: StatusVariant }> = {
  waiting: { label: 'Waiting', variant: 'wait' },
  accepted: { label: 'Extended', variant: 'ok' },
  refused: { label: 'Refused', variant: 'off' },
  lapsed: { label: 'Lapsed', variant: 'off' },
}

export interface ExtensionRequest {
  id: string
  order: { id: string, ref: string, state: OrderState, branch: { id: number, nameEn: string | null } | null } | null
  seller: { customerId: string, displayRef: string | null } | null
  reason: string
  reasonLabel: string
  detail: string
  state: ExtensionRequestState
  deadlineAtRequest: string
  deadlineNow: string | null
  secondsLeft: number | null
  extensionsBefore: number | null
  requestedAt: string
  answeredAt: string | null
  answeredBy: { staffId: string, name: string | null } | null
  hoursGranted: number | null
  answerNote: string | null
}

export interface ExtensionRequestPage { rows: ExtensionRequest[], nextCursor: string | null }

// One immutable inspection result: measurements and the derived outcome, never money.
export interface InspectionResult {
  id: string
  orderId: string
  branchId: number
  inspectedBy: string
  inspectedAt: string
  statedKarat: number | null
  measuredKarat: number | null
  statedWeightG: string | null
  measuredWeightG: string | null
  weightDiffPct: string | null
  measuredStoneGrade: string | null
  certificateNumber: string | null
  inspectorNote: string | null
  karatMismatch: boolean
  isCounterfeit: boolean
  stoneBelowClaim: boolean
  outcome: InspectionOutcome
  supersedesId: string | null
  superseded: boolean
}

export interface OrderSettlement {
  finalWeightG: string | null
  finalBuyerTotal: Money
  finalSellerGross: Money
  commissionAmount: Money
  vatAmount: Money
  spreadAmount: Money
  sellerProceeds: Money
  balanceAmount: Money
}

export interface OrderLedgerEntry {
  id: string
  eventKind: string
  createdAt: string
  lines: Array<{ account: string, party: 'buyer' | 'seller' | 'dahab' | 'other', amount: Money }>
}

export interface OrderTimelineEvent {
  event: string
  at: string
  detail: Record<string, unknown>
}

// What the signed-in person may do now — the Backend decides (state, branch, permission).
export interface OrderCan {
  receive: boolean
  inspect: boolean
  correct: boolean
  proposePrice: boolean
  changeBranch: boolean
  extend: boolean
  handover: boolean
  returnHandover: boolean
  cancel: boolean
  // Spec 014.
  handleDispute: boolean
  answerExtension: boolean
  viewProxyId: boolean
}

// The person the buyer named to collect (Backend spec 014); the ID photo through its own call.
export interface OrderProxy {
  name: string | null
  phone: string | null
  namedAt: string | null
  hasIdPhoto: boolean
  collectedByProxy: boolean
}

export interface OrderDisputeRef {
  id: string
  ref: string
  raisedAs: 'buyer' | 'seller'
  reason: string
  state: string
  outcome: string | null
  openedAt: string
}

export interface OrderDetail extends Order {
  lockedTotalPrice: Money
  depositAmount: Money
  lockedSellerUnitRate: Money | null
  lockedBuyerUnitRate: Money | null
  settlement: OrderSettlement | null
  inspections: InspectionResult[]
  latestInspectionId: string | null
  proposedPrice: Money | null
  decisionDueDeadline: string | null
  balanceDueDeadline: string | null
  reachBranchDeadline: string
  collectDeadline: string | null
  collection: { collectedAt: string | null, failedAttempts: number, lockedUntil: string | null, proxy: OrderProxy | null } | null
  sellerReturn: { returnDeadline: string, collectedAt: string | null, relistedAt: string | null, failedAttempts: number, lockedUntil: string | null } | null
  cancelReason: string | null
  ledger: OrderLedgerEntry[]
  timeline: OrderTimelineEvent[]
  disputes: OrderDisputeRef[]
  extensionRequest: ExtensionRequest | null
  // Spec 018.
  freeRelist: FreeRelist | null
  relistedFromOrder: { id: string, orderRef: string } | null
  // null = the viewer does not hold `rating.view` (the key is absent); [] = nobody rated yet.
  ratings: OrderRating[] | null
  can: OrderCan
}

export interface OrderCounts {
  open: number
  waitingSeller: number
  atIgi: number
  needsDecision: number
  waitingBalance: number
  readyToCollect: number
  returns: number
  pastDeadline: number
}

export interface OrderFilters {
  group: OrderGroup
  pastDeadline: boolean
  branchId: number | null
  q: string
  // Spec 018: only orders whose free-relist offer is in that state.
  freeRelist: FreeRelistFilter | null
}

export interface OrderPage {
  rows: Order[]
  nextCursor: string | null
  counts: OrderCounts
}

// A piece at the branch (work list): only what receiving, inspecting and handing over need.
export type WorkTask = 'receive' | 'inspect' | 'correct' | 'handover' | 'return_handover'

export interface WorkListItem {
  orderId: string
  orderRef: string
  state: OrderState
  task: WorkTask | null
  pieceType: { id: number, nameEn: string | null }
  category: ListingCategory
  statedKarat: number | null
  statedWeightG: string | null
  latestInspection: InspectionResult | null
  branch: { id: number | null, nameEn: string | null }
  since: string
}

export interface WorkListPage { rows: WorkListItem[], nextCursor: string | null }

// A row of the Inspections list: the result plus the order and the piece. Still no money.
export interface InspectionRow extends InspectionResult {
  orderRef: string | null
  orderState: OrderState | null
  piece: { listingId: string, category: ListingCategory, pieceType: { id: number, nameEn: string | null } } | null
  sellerRef: string | null
  branch: { id: number, nameEn: string | null }
  receivedAt: string | null
}

export interface InspectionFilters {
  from: string | null
  to: string | null
  branchId: number | null
  outcome: InspectionOutcome | null
}

export interface InspectionPage { rows: InspectionRow[], nextCursor: string | null }

// What the inspector enters; the Backend derives the outcome.
export interface InspectionInput {
  measuredKarat: number | null
  measuredWeightG: string | null
  measuredStoneGrade: string | null
  certificateNumber: string | null
  inspectorNote: string | null
  isCounterfeit: boolean
  stoneBelowClaim: boolean
  supersedesId: string | null
}

// The piece an inspection result is entered for, from the work list or the order detail.
export interface InspectionTarget {
  orderId: string
  orderRef: string
  category: ListingCategory
  pieceName: string | null
  statedKarat: number | null
  statedWeightG: string | null
  // Set when the result corrects the latest one.
  correcting: InspectionResult | null
}

const CATEGORY_NAMES: Record<ListingCategory, string> = { gold: 'Gold', diamond: 'Diamond', gold_with_diamond: 'Gold and diamond' }

// "Gold ring, 21K" — as the design names a piece.
export function pieceTitle (category: ListingCategory, typeName: string | null, karat: number | null): string {
  const name = `${CATEGORY_NAMES[category] ?? category} ${(typeName ?? 'piece').toLowerCase()}`
  return karat === null ? name : `${name}, ${karat}K`
}
