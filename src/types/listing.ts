// Listings to review (Backend spec 010, contracts/listings-api.md). A seller lists a
// piece; it goes live only after someone here approves it. Money is a 4-place decimal
// string and weight a 3-place one from the Backend; the UI formats them and never
// computes with them (the one display ratio, "as % of gold value", is labelled as such).
import type { StatusVariant } from './status'
import type { Money } from './wallet'

// The states this screen works with. The Backend has more (reserved, accepted, …) for
// later modules, so an unknown one is kept as a plain string and shown as it is.
export type KnownListingState
  = | 'draft'
    | 'in_review'
    | 'changes_requested'
    | 'live'
    | 'rejected'
    | 'withdrawn'
    | 'suspended_hold'
export type ListingState = KnownListingState | (string & {})

export type ListingCategory = 'gold' | 'diamond' | 'gold_with_diamond'
export type ListingMediaKind = 'photo' | 'video' | 'invoice' | 'stone_certificate'
export type ListingDecision = 'approve' | 'request-changes' | 'reject' | 'takedown'

// The queues of the screen: the design's chips, plus Live as the way to the take-down.
export type ListingQueue = 'in_review' | 'changes_requested' | 'live' | 'rejected'

const STATE_META: Record<KnownListingState, { label: string, variant: StatusVariant }> = {
  draft: { label: 'Draft', variant: 'off' },
  in_review: { label: 'Waiting', variant: 'wait' },
  changes_requested: { label: 'Changes asked', variant: 'warn' },
  live: { label: 'Live', variant: 'ok' },
  rejected: { label: 'Rejected', variant: 'bad' },
  withdrawn: { label: 'Taken down', variant: 'off' },
  suspended_hold: { label: 'On hold', variant: 'warn' },
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
}

// The detail endpoint adds the history and the "sent back" counters.
export interface ListingDetail extends Listing {
  history: ListingHistoryEntry[]
  sentBackCount: number
  sellerListingsSentBack: number
  sellerListingsSubmitted: number
  sellerListingNumber: number
}

export interface ListingCounts {
  inReview: number
  changesRequested: number
  approvedToday: number
  rejected: number
  live: number
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
