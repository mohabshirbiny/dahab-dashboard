import type {
  ApiCustomerActivityPage,
  ApiCustomerFile,
  ApiCustomerFileDocument,
  ApiCustomerSessions,
  ApiCustomerVerification,
  ApiEnvelope,
  ApiPaginated,
  ApiStaffRef,
} from '@/types/api'
import type { AuditEntry } from '@/types/audit'
import type {
  CustomerCounts,
  CustomerFile,
  CustomerFileDocument,
  CustomerInboxPage,
  CustomerListParams,
  CustomerListResult,
  CustomerSessionsResult,
  CustomerStatus,
  CustomerVerification,
  StaffRef,
  SuspendedReason,
} from '@/types/customer'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'
import { CUSTOMER_STATUSES } from '@/types/customer'
import { toEntry } from './audit.service'
import { toPayoutAccount } from './withdrawal.service'

function toCustomer (customer: ApiCustomerVerification): CustomerVerification {
  const doc = customer.latest_document
  return {
    id: customer.id,
    displayRef: customer.display_ref,
    fullName: customer.full_name,
    phone: customer.phone,
    email: customer.email,
    governorate: customer.governorate,
    type: customer.customer_type,
    status: customer.status,
    suspendedReason: customer.suspended_reason,
    submittedAt: customer.submitted_at,
    latestDocument: doc && {
      id: doc.document_id,
      type: doc.doc_kind,
      status: doc.status,
      attemptNumber: doc.attempt_number ?? 1,
      hasBack: doc.has_back,
      reviewReasons: doc.review_reasons ?? [],
      reviewNote: doc.review_note,
      submittedAt: doc.created_at,
      reviewedAt: doc.reviewed_at,
    },
  }
}

function toStaffRef (ref: ApiStaffRef | null): StaffRef | null {
  return ref && { id: ref.id, name: ref.full_name }
}

function toFileDocument (doc: ApiCustomerFileDocument): CustomerFileDocument {
  return {
    id: doc.document_id,
    type: doc.doc_kind,
    status: doc.status,
    attemptNumber: doc.attempt_number ?? 1,
    hasBack: doc.has_back,
    reviewReasons: doc.review_reasons ?? [],
    reviewNote: doc.review_note,
    submittedAt: doc.created_at,
    reviewedAt: doc.reviewed_at,
    reviewedBy: toStaffRef(doc.reviewed_by),
  }
}

function toCustomerFile (file: ApiCustomerFile): CustomerFile {
  const documents = file.documents.map(doc => toFileDocument(doc))
  return {
    ...toCustomer({ ...file, latest_document: file.latest_document }),
    latestDocument: documents[0] ?? null,
    preferredLang: file.preferred_lang,
    joinedAt: file.joined_at,
    documents,
    suspension: file.suspension && {
      reason: file.suspension.reason,
      note: file.suspension.note,
      statusBefore: file.suspension.status_before,
      suspendedAt: file.suspension.suspended_at,
      suspendedBy: toStaffRef(file.suspension.suspended_by),
    },
    payoutAccounts: (file.payout_accounts ?? []).map(a => toPayoutAccount(a)),
    withdrawalPauseUntil: file.withdrawal_pause?.until ?? null,
    withdrawalPauseTrigger: file.withdrawal_pause?.trigger_kind ?? null,
    closure: file.closure ? { closedAt: file.closure.closed_at, reason: file.closure.reason, note: file.closure.note } : null,
    firstSale: file.first_sale
      ? {
          state: file.first_sale.state,
          enablement: file.first_sale.enablement && {
            id: file.first_sale.enablement.enablement_id,
            reason: file.first_sale.enablement.reason,
            createdAt: file.first_sale.enablement.created_at,
          },
          advance: file.first_sale.advance && {
            id: file.first_sale.advance.advance_id,
            amountEgp: file.first_sale.advance.amount_egp,
            status: file.first_sale.advance.status,
            basis: file.first_sale.advance.basis,
            advancedAt: file.first_sale.advance.advanced_at,
          },
        }
      : null,
  }
}

// One row per page is enough: the Backend reports the total of the whole filtered set.
async function countWithStatus (status: CustomerStatus): Promise<number> {
  const { data } = await http.get<ApiPaginated<ApiCustomerVerification>>(endpoints.customers, {
    params: { status, per_page: 1 },
  })
  return data.meta.total
}

export const customerService = {
  // GET /dashboard/customers?status=&per_page=&page=   (customer.view)
  // The Backend filters by status only and sorts oldest first.
  async listCustomers (params: CustomerListParams): Promise<CustomerListResult> {
    const { data } = await http.get<ApiPaginated<ApiCustomerVerification>>(endpoints.customers, {
      params: { status: params.status, per_page: params.pageSize, page: params.page },
    })
    return {
      items: data.data.map(customer => toCustomer(customer)),
      total: data.meta.total,
      page: data.meta.current_page,
      pageSize: data.meta.per_page,
    }
  },

  // GET /dashboard/customers?q=   (customer.view)
  // Exact match on the customer reference or the E.164 phone, in any status (Backend spec 007).
  async searchCustomers (q: string): Promise<CustomerVerification[]> {
    const { data } = await http.get<ApiPaginated<ApiCustomerVerification>>(endpoints.customers, {
      params: { q, per_page: 10 },
    })
    return data.data.map(customer => toCustomer(customer))
  },

  // GET /dashboard/customers/{id}   (customer.view)
  // The customer file (Backend spec 007). The Backend records every call as
  // "verification details viewed", so callers load it once per opening.
  async getCustomer (id: string): Promise<CustomerFile> {
    const { data } = await http.get<ApiEnvelope<ApiCustomerFile>>(endpoints.customer(id))
    return toCustomerFile(data.data)
  },

  // POST /dashboard/customers/{id}/suspend   (customer.suspend, Idempotency-Key)
  // `idempotencyKey` stays the same when the same submission is retried, so the
  // Backend replays it instead of suspending twice. Returns the updated file.
  async suspend (id: string, input: { reason: SuspendedReason, note: string }, idempotencyKey: string): Promise<CustomerFile> {
    const { data } = await http.post<ApiEnvelope<ApiCustomerFile>>(endpoints.customerSuspend(id), input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toCustomerFile(data.data)
  },

  // POST /dashboard/customers/{id}/reinstate   (customer.suspend, Idempotency-Key)
  async reinstate (id: string, input: { note: string }, idempotencyKey: string): Promise<CustomerFile> {
    const { data } = await http.post<ApiEnvelope<ApiCustomerFile>>(endpoints.customerReinstate(id), input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return toCustomerFile(data.data)
  },

  // GET /dashboard/customers/{id}/activity?cursor=   (customer.view + audit.view_all | audit.view_own)
  // The file's History: Audit log entries about the customer, newest first. Not audited.
  async getActivity (id: string, cursor: string | null): Promise<{ entries: AuditEntry[], nextCursor: string | null }> {
    const { data } = await http.get<ApiCustomerActivityPage>(endpoints.customerActivity(id), {
      params: { per_page: 20, ...(cursor ? { cursor } : {}) },
    })
    return { entries: data.data.map(entry => toEntry(entry)), nextCursor: data.meta.next_cursor }
  },

  // GET /dashboard/customers/{id}/sessions?page=   (customer.view)
  // Every device, and the sessions still open. Not audited.
  async getSessions (id: string, page: number): Promise<CustomerSessionsResult> {
    const { data } = await http.get<ApiCustomerSessions>(endpoints.customerSessions(id), {
      params: { page, per_page: 10 },
    })
    return {
      devices: data.data.devices.map(d => ({ ref: d.device_ref, firstSeenAt: d.first_seen_at, lastSeenAt: d.last_seen_at })),
      sessions: data.data.sessions.map(s => ({ id: s.session_id, startedAt: s.started_at, lastActiveAt: s.last_active_at, expiresAt: s.expires_at })),
      page: data.meta.current_page,
      pageSize: data.meta.per_page,
      total: data.meta.total,
    }
  },

  // GET /dashboard/customers/{id}/notifications?cursor=   (customer.view, Backend spec 017)
  // What the customer was sent, as their inbox shows it. Read-only.
  async getNotifications (id: string, cursor: string | null): Promise<CustomerInboxPage> {
    const { data } = await http.get<{ data: Array<{ id: string, type: string, title: string, body: string, link: { kind: string }, created_at: string, read_at: string | null }>, meta: { next_cursor: string | null } }>(
      endpoints.customerNotifications(id), { params: cursor ? { cursor } : {} },
    )
    return {
      items: data.data.map(n => ({ id: n.id, type: n.type, title: n.title, body: n.body, linkKind: n.link.kind, createdAt: n.created_at, readAt: n.read_at })),
      nextCursor: data.meta.next_cursor,
    }
  },

  // The Backend has no counts endpoint, so each tab is counted from the
  // `meta.total` of its own list.
  async getCounts (): Promise<CustomerCounts> {
    const totals = await Promise.all(CUSTOMER_STATUSES.map(status => countWithStatus(status)))
    const counts = { pending_verification: 0, active: 0, rejected: 0, suspended: 0, closed: 0 } satisfies CustomerCounts
    for (const [index, status] of CUSTOMER_STATUSES.entries()) {
      counts[status] = totals[index] ?? 0
    }
    return counts
  },

  // Waiting count for the sidebar badge, counted the same way.
  getWaitingCount (): Promise<number> {
    return countWithStatus('pending_verification')
  },
}
