// Buy requests across listings (Backend spec 012 US10, FR-023): read-only, soonest
// seller-reply deadline first. Buyer and seller by display reference only.
import type { ListingCategory } from './listing'
import type { StatusVariant } from './status'
import type { Money } from './wallet'

export type KnownBuyRequestState
  = | 'queued'
    | 'accepted'
    | 'released_not_chosen'
    | 'released_declined'
    | 'released_expired'
    | 'withdrawn_by_buyer'
export type BuyRequestState = KnownBuyRequestState | (string & {})

// The Backend's filter: ended = every released or withdrawn request.
export type BuyRequestFilterState = 'queued' | 'accepted' | 'ended'

const STATE_META: Record<KnownBuyRequestState, { label: string, variant: StatusVariant }> = {
  queued: { label: 'In line', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'ok' },
  released_not_chosen: { label: 'Not chosen', variant: 'off' },
  released_declined: { label: 'Declined', variant: 'off' },
  released_expired: { label: 'No answer in time', variant: 'warn' },
  withdrawn_by_buyer: { label: 'Left the line', variant: 'off' },
}

export function buyRequestStateMeta (state: BuyRequestState): { label: string, variant: StatusVariant } {
  return STATE_META[state as KnownBuyRequestState] ?? { label: state.replaceAll('_', ' '), variant: 'info' }
}

export interface StaffBuyRequest {
  id: string
  state: BuyRequestState
  listing: {
    listingId: string
    category: ListingCategory
    pieceType: { id: number, nameEn: string | null }
    karat: number | null
    weightG: string | null
  }
  seller: { customerId: string, displayRef: string | null }
  buyer: { customerId: string, displayRef: string | null }
  // Only while queued.
  placeInLine: number | null
  queueLength: number
  lockedTotalPrice: Money
  depositAmount: Money
  requestedAt: string
  sellerReplyDeadline: string
  nearExpiry: boolean
  orderRef: string | null
}

export interface BuyRequestFilters {
  state: BuyRequestFilterState
  nearExpiry: boolean
  branchId: number | null
  listingId: string | null
}

export interface BuyRequestPage {
  rows: StaffBuyRequest[]
  nextCursor: string | null
  counts: { queued: number, nearExpiry: number }
}
