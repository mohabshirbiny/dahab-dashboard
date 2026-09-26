import type { IdentityDocumentStatus, IdentityDocumentType } from './identity'
import type { StatusVariant } from './status'

// The Backend `customer.status` lifecycle. The four Users and verification tabs map 1:1 to it.
export type CustomerStatus = 'pending_verification' | 'active' | 'rejected' | 'suspended'

export const CUSTOMER_STATUS_META: Record<CustomerStatus, { label: string, variant: StatusVariant }> = {
  pending_verification: { label: 'Waiting', variant: 'wait' },
  active: { label: 'Verified', variant: 'ok' },
  rejected: { label: 'Rejected', variant: 'bad' },
  suspended: { label: 'Suspended', variant: 'off' },
}

export type CustomerType = 'ordinary' | 'market_maker'

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  ordinary: 'Ordinary',
  market_maker: 'Market maker',
}

// The identity document sent with the customer's registration. The Backend sends the
// review metadata only; the images come from the identity-documents endpoint.
export interface CustomerLatestDocument {
  id: string
  type: IdentityDocumentType
  status: IdentityDocumentStatus
  hasBack: boolean
  reviewReasons: string[]
  reviewNote: string | null
  submittedAt: string
  // Null until someone decides on it.
  reviewedAt: string | null
}

export interface CustomerVerification {
  id: string
  displayRef: string
  fullName: string | null
  phone: string
  email: string | null
  // Backend governorate code, for example `red_sea`.
  governorate: string | null
  type: CustomerType
  status: CustomerStatus
  suspendedReason: string | null
  // When the account was created.
  submittedAt: string
  latestDocument: CustomerLatestDocument | null
}

// The Backend lists one status at a time, oldest first.
export interface CustomerFilters {
  status: CustomerStatus
  page: number
  // The customer whose panel is open, kept in the URL so refresh and Back land on it.
  customer: string | null
}

export interface CustomerListParams {
  status: CustomerStatus
  page: number
  pageSize: number
}

export interface CustomerCounts {
  pending_verification: number
  active: number
  rejected: number
  suspended: number
}

export interface CustomerListResult {
  items: CustomerVerification[]
  // Customers with this status, before paging.
  total: number
  page: number
  pageSize: number
}

export const CUSTOMER_PAGE_SIZE = 10

export const CUSTOMER_STATUSES: readonly CustomerStatus[] = ['pending_verification', 'active', 'rejected', 'suspended']

export const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = {
  status: 'pending_verification',
  page: 1,
  customer: null,
}

// `red_sea` becomes `Red sea`. The Backend sends codes only; labels are the UI's job.
export function governorateLabel (code: string | null): string {
  if (!code) {
    return ''
  }
  const words = code.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
