import type { ApiEnvelope } from '@/types/api'
import type {
  Dispute,
  DisputeAssignee,
  DisputeDetail,
  DisputeFilter,
  DisputeHistoryEntry,
  DisputeOutcome,
  DisputePage,
  DisputeReason,
  DisputeState,
  ResolveInput,
} from '@/types/dispute'
import type { OrderState } from '@/types/order'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'
import { type ApiOrderDetail, toDetail } from './order.service'

// Backend shapes (snake_case), spec 014 contracts/disputes-api.md: StaffDispute.
interface ApiStaffRef { staff_id: string, name: string | null }

interface ApiDispute {
  id: string
  ref: string
  order: { id: string, ref: string | null, state: OrderState | null, frozen_from: OrderState }
  reason: DisputeReason
  reason_label: string
  raised_as: 'buyer' | 'seller'
  raised_by: { customer_id: string, display_ref: string | null }
  state: DisputeState
  assigned_to: ApiStaffRef | null
  opened_at: string
  age_seconds: number
  outcome: DisputeOutcome | null
}

interface ApiDisputeDetail extends Omit<ApiDispute, 'order'> {
  order: ApiOrderDetail & { frozen_from: OrderState }
  detail: string
  photos: Array<{ id: string, mime: string, position: number }>
  history: Array<{
    kind: string
    by: { type: 'customer', role: 'buyer' | 'seller' } | { type: 'staff', staff_id: string, name: string | null }
    assigned_to: ApiStaffRef | null
    note: string | null
    at: string
  }>
  reply: string | null
  resolved_by: ApiStaffRef | null
  resolved_at: string | null
  compensations: Array<{ party: 'buyer' | 'seller', amount: string, reason: string, note: string, paid_by: ApiStaffRef, paid_at: string }>
  can: {
    pass_on: boolean
    resolve_resume: boolean
    resolve_against_sale: boolean
    compensate: boolean
    suspend_seller: boolean
    compensation_caps: { per_payment: string, left_today: string } | null
  }
}

interface ApiDisputePage {
  data: ApiDispute[]
  meta: { per_page: number, next_cursor: string | null, counts: { open: number, passed_on: number } }
}

const staffRef = (r: ApiStaffRef | null) => (r ? { staffId: r.staff_id, name: r.name } : null)

function toDispute (d: ApiDispute): Dispute {
  return {
    id: d.id,
    ref: d.ref,
    order: { id: d.order.id, ref: d.order.ref, state: d.order.state, frozenFrom: d.order.frozen_from },
    reason: d.reason,
    reasonLabel: d.reason_label,
    raisedAs: d.raised_as,
    raisedBy: { customerId: d.raised_by.customer_id, displayRef: d.raised_by.display_ref },
    state: d.state,
    assignedTo: staffRef(d.assigned_to),
    openedAt: d.opened_at,
    ageSeconds: d.age_seconds,
    outcome: d.outcome,
  }
}

function toHistory (h: ApiDisputeDetail['history'][number]): DisputeHistoryEntry {
  return {
    kind: h.kind,
    by: h.by.type === 'staff' ? { type: 'staff', staffId: h.by.staff_id, name: h.by.name } : { type: 'customer', role: h.by.role },
    assignedTo: staffRef(h.assigned_to),
    note: h.note,
    at: h.at,
  }
}

function toDisputeDetail (d: ApiDisputeDetail): DisputeDetail {
  return {
    ...toDispute({ ...d, order: { id: d.order.id, ref: d.order.order_ref, state: d.order.state, frozen_from: d.order.frozen_from } }),
    order: { ...toDetail(d.order), frozenFrom: d.order.frozen_from },
    detail: d.detail,
    photos: d.photos,
    history: d.history.map(h => toHistory(h)),
    reply: d.reply,
    resolvedBy: staffRef(d.resolved_by),
    resolvedAt: d.resolved_at,
    compensations: d.compensations.map(c => ({
      party: c.party, amount: c.amount, reason: c.reason, note: c.note, paidBy: staffRef(c.paid_by)!, paidAt: c.paid_at,
    })),
    can: {
      passOn: d.can.pass_on,
      resolveResume: d.can.resolve_resume,
      resolveAgainstSale: d.can.resolve_against_sale,
      compensate: d.can.compensate,
      suspendSeller: d.can.suspend_seller,
      compensationCaps: d.can.compensation_caps
        ? { perPayment: d.can.compensation_caps.per_payment, leftToday: d.can.compensation_caps.left_today }
        : null,
    },
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

// The Disputes page (Backend spec 014). Every route needs dispute.handle; a resolution
// with money or a suspension also needs order.refund / compensation.pay / customer.suspend.
// Every action sends the caller's Idempotency-Key.
export const disputeService = {
  // GET /dashboard/disputes — newest first.
  async list (filter: DisputeFilter, assignedToMe: boolean, q: string, cursor: string | null, perPage = 25): Promise<DisputePage> {
    const { data } = await http.get<ApiDisputePage>(endpoints.disputes, {
      params: {
        state: filter,
        assigned: assignedToMe ? 'me' : undefined,
        q: q.trim() === '' ? undefined : q.trim(),
        cursor: cursor ?? undefined,
        per_page: perPage,
      },
    })
    return {
      rows: data.data.map(d => toDispute(d)),
      nextCursor: data.meta.next_cursor,
      counts: { open: data.meta.counts.open, passedOn: data.meta.counts.passed_on },
    }
  },

  async show (id: string): Promise<DisputeDetail> {
    const { data } = await http.get<ApiEnvelope<ApiDisputeDetail>>(endpoints.dispute(id))
    return toDisputeDetail(data.data)
  },

  // GET /dashboard/disputes/{id}/photos/{photo} — the decrypted photo; audited, never cached.
  async photo (id: string, photoId: string): Promise<Blob> {
    const response = await http.get<Blob>(endpoints.disputePhoto(id, photoId), { responseType: 'blob' })
    return response.data
  },

  async assignees (): Promise<DisputeAssignee[]> {
    const { data } = await http.get<ApiEnvelope<DisputeAssignee[]>>(endpoints.disputeAssignees)
    return data.data
  },

  // POST /dashboard/disputes/{id}/pass-on — nothing is sent to the customer.
  async passOn (id: string, assigneeId: string, note: string, idempotencyKey: string): Promise<DisputeDetail> {
    const { data } = await http.post<ApiEnvelope<ApiDisputeDetail>>(endpoints.disputeAction(id, 'pass-on'),
      { assignee_id: assigneeId, note }, keyHeader(idempotencyKey))
    return toDisputeDetail(data.data)
  },

  // POST /dashboard/disputes/{id}/resolve — always with a reply.
  async resolve (id: string, input: ResolveInput, idempotencyKey: string): Promise<DisputeDetail> {
    const body = {
      outcome: input.outcome,
      reply: input.reply,
      compensation: input.compensation,
      suspend_seller: input.suspendSeller,
    }
    const { data } = await http.post<ApiEnvelope<ApiDisputeDetail>>(endpoints.disputeAction(id, 'resolve'), body, keyHeader(idempotencyKey))
    return toDisputeDetail(data.data)
  },
}
