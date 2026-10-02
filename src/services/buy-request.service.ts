import type { BuyRequestFilters, BuyRequestPage, BuyRequestState } from '@/types/buyRequest'
import type { ListingCategory } from '@/types/listing'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shape (snake_case), spec 012 StaffBuyRequest.
interface ApiStaffBuyRequest {
  id: string
  state: BuyRequestState
  listing: {
    listing_id: string
    category: ListingCategory
    piece_type: { id: number, name_en: string | null, name_ar: string | null }
    karat: number | null
    weight_g: string | null
  }
  seller: { customer_id: string, display_ref: string | null }
  buyer: { customer_id: string, display_ref: string | null }
  place_in_line: number | null
  queue_length: number
  locked_total_price: string
  deposit_amount: string
  requested_at: string
  seller_reply_deadline: string
  near_expiry: boolean
  order_ref: string | null
}

interface ApiBuyRequestPage {
  data: ApiStaffBuyRequest[]
  meta: { per_page: number, next_cursor: string | null, counts: { queued: number, near_expiry: number } }
}

// Buy requests across listings (Backend spec 012 US10), read-only.
export const buyRequestService = {
  // GET /dashboard/buy-requests   (buy_request.view)
  async list (filters: BuyRequestFilters, cursor: string | null, perPage = 25): Promise<BuyRequestPage> {
    const { data } = await http.get<ApiBuyRequestPage>(endpoints.buyRequests, {
      params: {
        state: filters.state,
        near_expiry: filters.nearExpiry ? 1 : undefined,
        branch_id: filters.branchId ?? undefined,
        listing_id: filters.listingId ?? undefined,
        cursor: cursor ?? undefined,
        per_page: perPage,
      },
    })
    return {
      rows: data.data.map(r => ({
        id: r.id,
        state: r.state,
        listing: {
          listingId: r.listing.listing_id,
          category: r.listing.category,
          pieceType: { id: r.listing.piece_type.id, nameEn: r.listing.piece_type.name_en },
          karat: r.listing.karat,
          weightG: r.listing.weight_g,
        },
        seller: { customerId: r.seller.customer_id, displayRef: r.seller.display_ref },
        buyer: { customerId: r.buyer.customer_id, displayRef: r.buyer.display_ref },
        placeInLine: r.place_in_line,
        queueLength: r.queue_length,
        lockedTotalPrice: r.locked_total_price,
        depositAmount: r.deposit_amount,
        requestedAt: r.requested_at,
        sellerReplyDeadline: r.seller_reply_deadline,
        nearExpiry: r.near_expiry,
        orderRef: r.order_ref,
      })),
      nextCursor: data.meta.next_cursor,
      counts: { queued: data.meta.counts.queued, nearExpiry: data.meta.counts.near_expiry },
    }
  },
}
