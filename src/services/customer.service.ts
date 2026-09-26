import type { ApiCustomerVerification, ApiEnvelope, ApiPaginated } from '@/types/api'
import type {
  CustomerCounts,
  CustomerListParams,
  CustomerListResult,
  CustomerStatus,
  CustomerVerification,
} from '@/types/customer'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'
import { CUSTOMER_STATUSES } from '@/types/customer'

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
      hasBack: doc.has_back,
      reviewReasons: doc.review_reasons ?? [],
      reviewNote: doc.review_note,
      submittedAt: doc.created_at,
      reviewedAt: doc.reviewed_at,
    },
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

  // GET /dashboard/customers/{id}   (customer.view)
  // The Backend records every call as "verification details viewed".
  async getCustomer (id: string): Promise<CustomerVerification> {
    const { data } = await http.get<ApiEnvelope<ApiCustomerVerification>>(endpoints.customer(id))
    return toCustomer(data.data)
  },

  // The Backend has no counts endpoint, so each tab is counted from the
  // `meta.total` of its own list.
  async getCounts (): Promise<CustomerCounts> {
    const totals = await Promise.all(CUSTOMER_STATUSES.map(status => countWithStatus(status)))
    const counts = { pending_verification: 0, active: 0, rejected: 0, suspended: 0 } satisfies CustomerCounts
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
