import type { IdentityDocumentSide, IdentityReviewInput } from '@/types/identity'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// The identity document is the one sent with a customer's registration, so it is only
// ever reached from that customer's file (`customer.service.ts`). This service does the
// two things that act on the document itself.
export const identityDocumentService = {
  // GET /dashboard/identity-documents/{id}/image?side=front|back   (identity.view)
  // Bytes, Bearer-authenticated, never cacheable, and every call is logged by the
  // Backend. That is why this returns a Blob for an object URL instead of an <img src>.
  async getIdentityDocumentImage (id: string, side: IdentityDocumentSide = 'front'): Promise<Blob> {
    const { data } = await http.get<Blob>(endpoints.identityDocumentImage(id), {
      params: { side },
      responseType: 'blob',
    })
    return data
  },

  // POST /dashboard/identity-documents/{id}/review   (identity.review)
  // `verify` activates the customer, `request_resubmission` asks for a new upload and
  // leaves them waiting, `reject` rejects the customer. The two that turn a document
  // down need at least one reason; the note is optional (max 1000 characters).
  async reviewIdentityDocument (id: string, input: IdentityReviewInput): Promise<void> {
    const body = input.action === 'verify'
      ? { action: input.action, ...(input.idNumber && { id_number: input.idNumber }) }
      : { action: input.action, reasons: input.reasons, ...(input.note.trim() && { note: input.note.trim() }) }
    await http.post(endpoints.identityDocumentReview(id), body)
  },

  // POST /dashboard/identity-documents/{id}/reopen   (identity.review)
  // "Move back to waiting": a rejected customer cannot send their ID again, so after they
  // contact customer service staff reopen the latest rejected attempt. It goes back to
  // pending with the same images and the customer back to waiting review; then the normal
  // Verify / Ask again / Reject apply. The reason (5 to 500 characters) is required and
  // recorded in the audit log.
  async reopenIdentityDocument (id: string, reason: string): Promise<void> {
    await http.post(endpoints.identityDocumentReopen(id), { reason: reason.trim() })
  },
}
