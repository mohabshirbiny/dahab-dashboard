// Listings to review (Backend spec 010, contracts/listings-api.md). A seller lists a
// piece; it goes live only after someone here approves it. Money is a 4-place decimal
// string and weight a 3-place one from the Backend; the UI formats them and never
// computes with them (the one display ratio, "as % of gold value", is labelled as such).
import type { StatusVariant } from './status'
import type { Money } from './wallet'

// Every state the Backend has; a new one is kept as a plain string and shown as it is.
// reserved (buyers in line) and accepted (a buyer chosen) come with buy requests (spec 011).
export type KnownListingState
  = | 'draft'
    | 'in_review'
    | 'changes_requested'
    | 'live'
    | 'reserved'
    | 'accepted'
    | 'rejected'
    | 'withdrawn'
    | 'suspended_hold'
    // After acceptance (Backend spec 012): the piece at the branch, settled, sold, or back with its seller.
    | 'at_inspection'
    | 'settling'
    | 'sold'
    | 'uncollected_expired'
    | 'awaiting_seller_return'
    | 'seller_unclaimed'
export type ListingState = KnownListingState | (string & {})

export type ListingCategory = 'gold' | 'diamond' | 'gold_with_diamond'
export type ListingMediaKind = 'photo' | 'video' | 'invoice' | 'stone_certificate'
export type ListingDecision = 'approve' | 'request-changes' | 'reject' | 'takedown'

// The queues of the screen: the design's chips, plus Live as the way to the take-down,
// and (spec 011) Reserved and Accepted to follow the buyers in line and the accepted sales.
export type ListingQueue = 'in_review' | 'changes_requested' | 'live' | 'reserved' | 'accepted' | 'rejected'

const STATE_META: Record<KnownListingState, { label: string, variant: StatusVariant }> = {
  draft: { label: 'Draft', variant: 'off' },
  in_review: { label: 'Waiting', variant: 'wait' },
  changes_requested: { label: 'Changes asked', variant: 'warn' },
  live: { label: 'Live', variant: 'ok' },
  reserved: { label: 'Buyers in line', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'ok' },
  rejected: { label: 'Rejected', variant: 'bad' },
  withdrawn: { label: 'Taken down', variant: 'off' },
  suspended_hold: { label: 'On hold', variant: 'warn' },
  at_inspection: { label: 'At inspection', variant: 'info' },
  settling: { label: 'Settling', variant: 'info' },
  sold: { label: 'Sold', variant: 'ok' },
  uncollected_expired: { label: 'Not collected', variant: 'bad' },
  awaiting_seller_return: { label: 'Held for the seller', variant: 'wait' },
  seller_unclaimed: { label: 'Seller never collected', variant: 'bad' },
}

export function listingStateMeta (state: ListingState): { label: string, variant: StatusVariant } {
  return STATE_META[state as KnownListingState] ?? { label: state.replaceAll('_', ' '), variant: 'info' }
}

export const LISTING_CATEGORY_LABELS: Record<ListingCategory, string> = {
  gold: 'Gold',
  diamond: 'Diamond',
  gold_with_diamond: 'Gold and diamond',
}

export const LISTING_MEDIA_LABELS: Record<ListingMediaKind, string> = {
  photo: 'Photo',
  video: 'Video',
  invoice: 'Original invoice',
  stone_certificate: 'Stone certificate',
}

export interface ListingMedia {
  id: string
  kind: ListingMediaKind
  isPrivate: boolean
  mime: string
  position: number
}

export interface ListingSeller {
  id: string
  displayRef: string
  fullName: string | null
  phoneMasked: string
  status: string
}

export interface ListingHistoryEntry {
  fromState: ListingState | null
  toState: ListingState
  actor: { type: 'customer' | 'staff', name: string | null }
  note: string | null
  changedAt: string
}

// Spec 022: one change of the price while the piece was live, oldest first.
export type ListingPriceField = 'making_charge_per_g' | 'asking_price'

export interface ListingPriceChange {
  field: ListingPriceField
  oldValue: Money
  newValue: Money
  actor: { type: 'customer' | 'staff', name: string | null }
  changedAt: string
}

export interface Listing {
  id: string
  state: ListingState
  category: ListingCategory
  pieceType: { id: number, nameEn: string, nameAr: string }
  karat: number | null
  statedWeightG: string | null
  makingChargePerG: Money | null
  askingPrice: Money | null
  description: string | null
  media: ListingMedia[]
  branchOptions: Array<{ id: number, nameEn: string, isEnabled: boolean }>
  // What a buyer would pay now; null when it cannot be quoted.
  currentPrice: Money | null
  priceAvailable: boolean
  priceIsIndicative: boolean
  youWouldReceive: Money | null
  // Stones only: the certificate the seller brings and what it costs them (null before it existed).
  certificateKind: 'igi' | 'other_lab' | 'none' | null
  certificateFee: Money | null
  // Stones only: the stone as the seller states it (carat, clarity vvs|vs|si|i, cut excellent|very_good|good).
  stone: { carat: string | null, clarity: string | null, cut: string | null } | null
  // What buyers pay per gram of this karat now (gold only).
  goldRatePerGram: Money | null
  seller: ListingSeller
  createdAt: string
  listedAt: string | null
  // For a waiting listing: since when it has waited.
  stateChangedAt: string
  canApprove: boolean
  canRequestChanges: boolean
  canReject: boolean
  canTakeDown: boolean
  // Spec 018: set when this listing is a buyer's free relist (0% commission) of a collected order.
  relistedFromOrder: { id: string, orderRef: string } | null
}

// One buyer in line (Backend spec 011), read-only: the buyer by reference only.
export interface ListingQueueItem {
  id: string
  placeInLine: number
  buyer: { id: string, displayRef: string }
  lockedTotalPrice: Money
  depositAmount: Money
  requestedAt: string
  sellerReplyDeadline: string
}

// The latest order on a piece (Backend spec 011): created when the seller accepted;
// cancelled_staff when Dahab cancelled it (then with when and why).
export type OrderState = 'awaiting_delivery' | 'cancelled_staff' | (string & {})

export interface ListingOrder {
  id: string
  orderRef: string
  state: OrderState
  branch: { id: number, nameEn: string } | null
  buyer: { id: string, displayRef: string }
  acceptedAt: string
  reachBranchDeadline: string
  lockedTotalPrice: Money
  depositAmount: Money | null
  cancelledAt: string | null
  cancelReason: string | null
  canCancel: boolean
}

// The detail endpoint adds the history, the "sent back" counters and (spec 011) the
// line and the latest order.
export interface ListingDetail extends Listing {
  history: ListingHistoryEntry[]
  // Spec 022: the seller's price changes while the piece was live; empty when there were none.
  priceHistory: ListingPriceChange[]
  sentBackCount: number
  sellerListingsSentBack: number
  sellerListingsSubmitted: number
  sellerListingNumber: number
  queue: ListingQueueItem[]
  order: ListingOrder | null
}

export interface ListingCounts {
  inReview: number
  changesRequested: number
  approvedToday: number
  rejected: number
  live: number
  reserved: number
  accepted: number
}

export interface ListingPage {
  rows: Listing[]
  nextCursor: string | null
  counts: ListingCounts
}

// "Gold ring, 21K · 30.000 g" — how the design names a piece.
export function listingTitle (listing: Pick<Listing, 'category' | 'pieceType' | 'karat'>): string {
  const name = `${LISTING_CATEGORY_LABELS[listing.category]} ${listing.pieceType.nameEn.toLowerCase()}`
  return listing.karat === null ? name : `${name}, ${listing.karat}K`
}
