// Terms and versions (Backend spec 019). Camel-case shapes the UI uses; the service maps the
// Backend's snake_case.

export type LegalKind = 'document' | 'declaration'

export interface LegalStaffRef {
  id: string
  fullName: string | null
}

// One document code with its live version (GET /dashboard/legal-documents).
export interface LegalDocument {
  code: string
  label: string
  kind: LegalKind
  published: boolean
  version: number | null
  legalDocId: number | null
  publishedAt: string | null
  publishedBy: LegalStaffRef | null
  isMaterial: boolean | null
  // Customers who accepted the live version.
  acceptedLiveCount: number
}

export interface LegalVersion {
  legalDocId: number
  version: number
  isMaterial: boolean
  publishedAt: string
  publishedBy: LegalStaffRef | null
  acceptedCount: number
  bodyEn: string | null
  bodyAr: string | null
}

export interface PublishLegalInput {
  code: string
  bodyEn: string
  bodyAr: string
  isMaterial: boolean
}

export interface PublishedLegalVersion {
  legalDocId: number
  code: string
  version: number
  publishedAt: string
  isMaterial: boolean
}

// Publishing these asks every customer without an acceptance to accept before they continue.
export const LEGAL_GATED_CODES: readonly string[] = ['terms', 'privacy']
