import type { ListingReport, ListingReportPage, ReportReason, ReportState } from '@/types/listingReport'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 017 contracts/account-api.md: StaffListingReport.
interface ApiListingReport {
  id: string
  reference: string
  reason: ReportReason
  reason_label: string
  note: string | null
  state: ReportState
  listing: { id: string, title: string | null, state: string | null, seller_ref: string | null }
  reporter_ref: string | null
  created_at: string
  handled_at: string | null
  handled_by: string | null
  staff_note: string | null
}

function toReport (r: ApiListingReport): ListingReport {
  return {
    id: r.id,
    reference: r.reference,
    reason: r.reason,
    reasonLabel: r.reason_label,
    note: r.note,
    state: r.state,
    listing: { id: r.listing.id, title: r.listing.title, state: r.listing.state, sellerRef: r.listing.seller_ref },
    reporterRef: r.reporter_ref,
    createdAt: r.created_at,
    handledAt: r.handled_at,
    handledBy: r.handled_by,
    staffNote: r.staff_note,
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

export const listingReportService = {
  // GET /dashboard/listing-reports?state=   (listing_report.handle) — open first, newest 100.
  async list (state: ReportState | null): Promise<ListingReportPage> {
    const { data } = await http.get<{ data: ApiListingReport[], meta: { counts: Record<ReportState, number> } }>(endpoints.listingReports, {
      params: state ? { state } : {},
    })
    return { rows: data.data.map(r => toReport(r)), counts: data.meta.counts }
  },

  async show (id: string): Promise<ListingReport> {
    const { data } = await http.get<{ data: ApiListingReport }>(endpoints.listingReport(id))
    return toReport(data.data)
  },

  // POST …/dismiss { note }; the reporter gets a generic inbox note.
  async dismiss (id: string, note: string, idempotencyKey: string): Promise<ListingReport> {
    const { data } = await http.post<{ data: ApiListingReport }>(endpoints.listingReportAction(id, 'dismiss'), { note }, keyHeader(idempotencyKey))
    return toReport(data.data)
  },

  // POST …/take-down { reason } (also listing.takedown): the spec 010 take-down, every open report on the piece actioned.
  async takeDown (id: string, reason: string, idempotencyKey: string): Promise<ListingReport> {
    const { data } = await http.post<{ data: ApiListingReport }>(endpoints.listingReportAction(id, 'take-down'), { reason }, keyHeader(idempotencyKey))
    return toReport(data.data)
  },
}
