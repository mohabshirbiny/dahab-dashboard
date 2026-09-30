import type { ApiEnvelope } from '@/types/api'
import type {
  Listing,
  ListingCategory,
  ListingDecision,
  ListingDetail,
  ListingMediaKind,
  ListingPage,
  ListingQueue,
  ListingState,
} from '@/types/listing'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 010 contracts/listings-api.md "Listing (staff view)".
interface ApiMedia { id: string, kind: ListingMediaKind, is_private: boolean, mime: string, position: number, url: string }

interface ApiListing {
  id: string
  state: ListingState
  category: ListingCategory
  piece_type: { id: number, name_en: string, name_ar: string }
  karat: number | null
  stated_weight_g: string | null
  making_charge_per_g: string | null
  asking_price: string | null
  description: string | null
  media: ApiMedia[]
  branch_options: Array<{ id: number, name_en: string, name_ar: string, is_enabled: boolean }>
  current_price: string | null
  price_available: boolean
  price_is_indicative: boolean
  you_would_receive: string | null
  gold_rate_per_gram: string | null
  seller: { id: string, display_ref: string, full_name: string | null, phone_masked: string, status: string }
  created_at: string
  listed_at: string | null
  state_changed_at: string
  can_approve: boolean
  can_request_changes: boolean
  can_reject: boolean
  can_take_down: boolean
}

interface ApiListingDetail extends ApiListing {
  history: Array<{
    from_state: ListingState | null
    to_state: ListingState
    actor: { type: 'customer' | 'staff', name: string | null }
    note: string | null
    changed_at: string
  }>
  sent_back_count: number
  seller_listings_sent_back: number
  seller_listings_submitted: number
  seller_listing_number: number
}

interface ApiListingPage {
  data: ApiListing[]
  meta: {
    per_page: number
    next_cursor: string | null
    counts: { in_review: number, changes_requested: number, approved_today: number, rejected: number, live: number }
  }
}

function toListing (l: ApiListing): Listing {
  return {
    id: l.id,
    state: l.state,
    category: l.category,
    pieceType: { id: l.piece_type.id, nameEn: l.piece_type.name_en, nameAr: l.piece_type.name_ar },
    karat: l.karat,
    statedWeightG: l.stated_weight_g,
    makingChargePerG: l.making_charge_per_g,
    askingPrice: l.asking_price,
    description: l.description,
    media: l.media.map(m => ({ id: m.id, kind: m.kind, isPrivate: m.is_private, mime: m.mime, position: m.position })),
    branchOptions: l.branch_options.map(b => ({ id: b.id, nameEn: b.name_en, isEnabled: b.is_enabled })),
    currentPrice: l.current_price,
    priceAvailable: l.price_available,
    priceIsIndicative: l.price_is_indicative,
    youWouldReceive: l.you_would_receive,
    goldRatePerGram: l.gold_rate_per_gram,
    seller: {
      id: l.seller.id,
      displayRef: l.seller.display_ref,
      fullName: l.seller.full_name,
      phoneMasked: l.seller.phone_masked,
      status: l.seller.status,
    },
    createdAt: l.created_at,
    listedAt: l.listed_at,
    stateChangedAt: l.state_changed_at,
    canApprove: l.can_approve,
    canRequestChanges: l.can_request_changes,
    canReject: l.can_reject,
    canTakeDown: l.can_take_down,
  }
}

function toDetail (l: ApiListingDetail): ListingDetail {
  return {
    ...toListing(l),
    history: l.history.map(h => ({ fromState: h.from_state, toState: h.to_state, actor: h.actor, note: h.note, changedAt: h.changed_at })),
    sentBackCount: l.sent_back_count,
    sellerListingsSentBack: l.seller_listings_sent_back,
    sellerListingsSubmitted: l.seller_listings_submitted,
    sellerListingNumber: l.seller_listing_number,
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

// Listings to review (Backend spec 010). Reading needs any listing permission; each
// decision needs its own. Every decision sends the caller's Idempotency-Key, so a
// retried submission is replayed rather than applied twice.
export const listingService = {
  // GET /dashboard/listings   (listing.review | listing.request_changes | listing.takedown)
  async list (state: ListingQueue, cursor: string | null, perPage = 25): Promise<ListingPage> {
    const { data } = await http.get<ApiListingPage>(endpoints.listings, { params: { state, cursor: cursor ?? undefined, per_page: perPage } })
    const counts = data.meta.counts
    return {
      rows: data.data.map(l => toListing(l)),
      nextCursor: data.meta.next_cursor,
      counts: {
        inReview: counts.in_review,
        changesRequested: counts.changes_requested,
        approvedToday: counts.approved_today,
        rejected: counts.rejected,
        live: counts.live,
      },
    }
  },

  // The sidebar badge: listings waiting for review. One row is enough, meta.counts has the number.
  async waitingCount (): Promise<number> {
    const { data } = await http.get<ApiListingPage>(endpoints.listings, { params: { state: 'in_review', per_page: 1 } })
    return data.meta.counts.in_review
  },

  // GET /dashboard/listings/{id}
  async show (id: string): Promise<ListingDetail> {
    const { data } = await http.get<ApiEnvelope<ApiListingDetail>>(endpoints.listing(id))
    return toDetail(data.data)
  },

  // GET /dashboard/listings/{id}/media/{media} — the decrypted file; never cached.
  async media (id: string, mediaId: string): Promise<Blob> {
    const response = await http.get<Blob>(endpoints.listingMedia(id, mediaId), { responseType: 'blob' })
    return response.data
  },

  // POST /dashboard/listings/{id}/approve | request-changes | reject | takedown
  async decide (id: string, decision: ListingDecision, note: string | null, idempotencyKey: string): Promise<ListingDetail> {
    const body = decision === 'approve' ? {} : (decision === 'request-changes' ? { message: note } : { reason: note })
    const { data } = await http.post<ApiEnvelope<ApiListingDetail>>(endpoints.listingAction(id, decision), body, keyHeader(idempotencyKey))
    return toDetail(data.data)
  },
}
