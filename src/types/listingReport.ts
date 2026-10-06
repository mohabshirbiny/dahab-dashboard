import type { StatusVariant } from './status'

// Listing reports (Backend spec 017 FR-052, FR-053): StaffListingReport.
export type ReportState = 'open' | 'dismissed' | 'actioned' | 'listing_gone'

export type ReportReason = 'photos_not_genuine' | 'price_or_weight_wrong' | 'description_mismatch' | 'not_theirs_to_sell' | 'off_platform_dealing' | 'other'

export interface ListingReport {
  id: string
  reference: string
  reason: ReportReason
  reasonLabel: string
  note: string | null
  state: ReportState
  listing: { id: string, title: string | null, state: string | null, sellerRef: string | null }
  // The reporter's reference — staff only; the seller never sees it.
  reporterRef: string | null
  createdAt: string
  handledAt: string | null
  handledBy: string | null
  staffNote: string | null
}

export interface ListingReportPage {
  rows: ListingReport[]
  counts: Record<ReportState, number>
}

export const REPORT_STATE_META: Record<ReportState, { label: string, variant: StatusVariant }> = {
  open: { label: 'Open', variant: 'wait' },
  dismissed: { label: 'Dismissed', variant: 'off' },
  actioned: { label: 'Taken down', variant: 'bad' },
  listing_gone: { label: 'Piece left the market', variant: 'off' },
}

export function reportStateMeta (state: string): { label: string, variant: StatusVariant } {
  return REPORT_STATE_META[state as ReportState] ?? { label: state.replaceAll('_', ' '), variant: 'info' }
}
