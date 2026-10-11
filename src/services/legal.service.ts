import type { ApiEnvelope } from '@/types/api'
import type { LegalDocument, LegalKind, LegalStaffRef, LegalVersion, PublishedLegalVersion, PublishLegalInput } from '@/types/legal'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 019 contracts/app-content-api.md and the generated OpenAPI.
interface ApiStaffRef { id: string, full_name: string | null }

interface ApiLegalDocument {
  code: string
  label: string
  kind: LegalKind
  published: boolean
  version: number | null
  legal_doc_id: number | null
  published_at: string | null
  published_by: ApiStaffRef | null
  is_material: boolean | null
  accepted_live_count: number
}

interface ApiLegalVersion {
  legal_doc_id: number
  version: number
  is_material: boolean
  published_at: string
  published_by: ApiStaffRef | null
  accepted_count: number
  body_en?: string
  body_ar?: string
}

const staff = (s: ApiStaffRef | null): LegalStaffRef | null => (s ? { id: s.id, fullName: s.full_name } : null)

function toDocument (d: ApiLegalDocument): LegalDocument {
  return {
    code: d.code,
    label: d.label,
    kind: d.kind,
    published: d.published,
    version: d.version,
    legalDocId: d.legal_doc_id,
    publishedAt: d.published_at,
    publishedBy: d.published ? staff(d.published_by) : null,
    isMaterial: d.is_material,
    acceptedLiveCount: d.accepted_live_count,
  }
}

function toVersion (v: ApiLegalVersion): LegalVersion {
  return {
    legalDocId: v.legal_doc_id,
    version: v.version,
    isMaterial: v.is_material,
    publishedAt: v.published_at,
    publishedBy: staff(v.published_by),
    acceptedCount: v.accepted_count,
    bodyEn: v.body_en ?? null,
    bodyAr: v.body_ar ?? null,
  }
}

// Terms and versions (Backend spec 019). Publishing sends the caller's Idempotency-Key, so a
// retried submission is replayed rather than published twice.
export const legalService = {
  // GET /dashboard/legal-documents   (legal.publish or content.edit)
  async documents (): Promise<LegalDocument[]> {
    const { data } = await http.get<ApiEnvelope<ApiLegalDocument[]>>(endpoints.legalDocuments)
    return data.data.map(d => toDocument(d))
  },

  // GET /dashboard/legal-documents/{code}/versions
  async versions (code: string, withBody: boolean): Promise<LegalVersion[]> {
    const { data } = await http.get<ApiEnvelope<ApiLegalVersion[]>>(endpoints.legalVersions(code), { params: { with_body: withBody ? 1 : undefined } })
    return data.data.map(v => toVersion(v))
  },

  // POST /dashboard/legal-documents/{code}/versions   (legal.publish)
  async publish (input: PublishLegalInput, idempotencyKey: string): Promise<PublishedLegalVersion> {
    const { data } = await http.post<ApiEnvelope<{ legal_doc_id: number, code: string, version: number, published_at: string, is_material: boolean }>>(
      endpoints.legalVersions(input.code),
      { body_en: input.bodyEn, body_ar: input.bodyAr, is_material: input.isMaterial },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    )
    return {
      legalDocId: data.data.legal_doc_id,
      code: data.data.code,
      version: data.data.version,
      publishedAt: data.data.published_at,
      isMaterial: data.data.is_material,
    }
  },
}
