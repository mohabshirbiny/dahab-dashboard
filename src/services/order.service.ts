import type { ApiEnvelope } from '@/types/api'
import type { ListingCategory, ListingState } from '@/types/listing'
import type {
  ExtendableDeadline,
  ExtensionHours,
  ExtensionRequest,
  ExtensionRequestPage,
  ExtensionRequestState,
  FreeRelistStatus,
  InspectionFilters,
  InspectionInput,
  InspectionOutcome,
  InspectionPage,
  InspectionResult,
  InspectionRow,
  Order,
  OrderDetail,
  OrderFilters,
  OrderPage,
  OrderState,
  WorkListItem,
  WorkListPage,
  WorkTask,
} from '@/types/order'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 012 contracts/orders-api.md: StaffOrder,
// InspectionResult, WorkListItem.
interface ApiPieceType { id: number, name_en: string | null, name_ar: string | null }

interface ApiOrder {
  id: string
  order_ref: string
  state: OrderState
  group: string
  listing_state: ListingState
  piece: { listing_id: string, category: ListingCategory, piece_type: ApiPieceType, karat: number | null, weight_g: string | null, listing_state: ListingState }
  seller: { customer_id: string, display_ref: string | null }
  buyer: { customer_id: string, display_ref: string | null }
  branch: { id: number | null, name_en: string | null, name_ar: string | null }
  value: string
  held: string
  paid: string | null
  deadline: { kind: string, at: string, overdue: boolean } | null
  accepted_at: string
  frozen?: boolean
  has_waiting_extension?: boolean
  // Spec 018: on list rows.
  free_relist_status?: string | null
}

// Spec 014: StaffExtensionRequest.
interface ApiExtensionRequest {
  id: string
  order?: { id: string, ref: string, state: OrderState, branch: { id: number, name_en: string | null, name_ar: string | null } | null }
  seller?: { customer_id: string, display_ref: string | null }
  reason: string
  reason_label: string
  detail: string
  state: ExtensionRequestState
  deadline_at_request: string
  deadline_now: string | null
  seconds_left: number | null
  extensions_before: number | null
  requested_at: string
  answered_at: string | null
  answered_by: { staff_id: string, name: string | null } | null
  hours_granted: number | null
  answer_note: string | null
}

interface ApiInspection {
  inspection_id: string
  order_id: string
  branch_id: number
  inspected_by: string
  inspected_at: string
  stated_karat: number | null
  measured_karat: number | null
  stated_weight_g: string | null
  measured_weight_g: string | null
  weight_diff_pct: string | null
  measured_stone_grade: string | null
  certificate_number: string | null
  inspector_note: string | null
  karat_mismatch: boolean
  is_counterfeit: boolean
  stone_below_claim: boolean
  outcome: InspectionOutcome
  supersedes_id: string | null
  superseded?: boolean
}

export interface ApiOrderDetail extends ApiOrder {
  locked_total_price: string
  deposit_amount: string
  locked_seller_unit_rate: string | null
  locked_buyer_unit_rate: string | null
  settlement: {
    final_weight_g: string | null
    final_buyer_total: string
    final_seller_gross: string
    commission_amount: string
    vat_amount: string
    spread_amount: string
    seller_proceeds: string
    balance_amount: string
  } | null
  // Backend spec 023: what the commission was and what a waiver took off it, and the advance paid on the order.
  commission_waiver?: {
    recorded: boolean
    kind: 'none' | 'free_relist' | 'market_maker' | 'credit' | null
    ordinary_egp: string | null
    charged_egp: string | null
    given_up_egp: string | null
    floor_egp: string | null
    floor_applied: boolean | null
    code: string | null
    spread_given_up_egp: string | null
  }
  advance?: {
    advance_id: string
    amount_egp: string
    basis: 'promo_code' | 'staff_enablement'
    promo_code: string | null
    status: 'outstanding' | 'recovered' | 'written_off'
    advanced_at: string
    recovered_egp: string | null
    shortfall_absorbed_egp: string | null
    written_off_reason: string | null
  } | null
  inspections: ApiInspection[]
  latest_inspection_id: string | null
  proposed_price: string | null
  decision_due_deadline: string | null
  balance_due_deadline: string | null
  reach_branch_deadline: string
  collect_deadline: string | null
  collection: {
    collected_at: string | null
    handover_by: string | null
    failed_attempts: number
    locked_until: string | null
    proxy?: { name: string | null, phone: string | null, named_at: string | null, has_id_photo: boolean, collected_by_proxy: boolean } | null
  } | null
  seller_return: { return_deadline: string, collected_at: string | null, relisted_at: string | null, compensation_txn_id: string | null, failed_attempts: number, locked_until: string | null } | null
  cancel_reason: string | null
  ledger: Array<{ ledger_txn_id: string, event_kind: string, created_at: string, lines: Array<{ account: string, party: 'buyer' | 'seller' | 'dahab' | 'other', amount: string }> }>
  timeline: Array<{ event: string, at: string, detail: Record<string, unknown> }>
  disputes?: Array<{ id: string, ref: string, raised_as: 'buyer' | 'seller', reason: string, state: string, outcome: string | null, opened_at: string }>
  extension_request?: ApiExtensionRequest | null
  // Spec 018: the offer; where this order is itself a free relist; ratings only with rating.view (key absent otherwise).
  free_relist?: { status: string, ends_at: string | null, listing: { id: string, title: string | null } | null } | null
  relisted_from_order?: { id: string, order_ref: string } | null
  ratings?: Array<{ party_role: 'buyer' | 'seller', stars: number, note: string | null, created_at: string }>
  can: {
    receive: boolean
    inspect: boolean
    correct: boolean
    propose_price: boolean
    change_branch: boolean
    extend: boolean
    handover: boolean
    return_handover: boolean
    cancel: boolean
    handle_dispute?: boolean
    answer_extension?: boolean
    view_proxy_id?: boolean
  }
}

interface ApiOrderPage {
  data: ApiOrder[]
  meta: {
    per_page: number
    next_cursor: string | null
    counts: { open: number, waiting_seller: number, at_igi: number, needs_decision: number, waiting_balance: number, ready_to_collect: number, returns: number, past_deadline: number }
  }
}

interface ApiWorkListItem {
  order_id: string
  order_ref: string
  state: OrderState
  task: WorkTask | null
  piece_type: ApiPieceType
  category: ListingCategory
  stated_karat: number | null
  stated_weight_g: string | null
  latest_inspection: ApiInspection | null
  branch: { id: number | null, name_en: string | null, name_ar: string | null }
  since: string
}

interface ApiInspectionRow extends ApiInspection {
  order_ref: string | null
  order_state: OrderState | null
  piece: { listing_id: string, category: ListingCategory, piece_type: ApiPieceType } | null
  seller_ref: string | null
  branch: { id: number, name_en: string | null, name_ar: string | null }
  received_at: string | null
}

interface ApiPage<T> { data: T[], meta: { per_page: number, next_cursor: string | null } }

function toOrder (o: ApiOrder): Order {
  return {
    id: o.id,
    orderRef: o.order_ref,
    state: o.state,
    group: o.group,
    listingState: o.listing_state,
    piece: {
      listingId: o.piece.listing_id,
      category: o.piece.category,
      pieceType: { id: o.piece.piece_type.id, nameEn: o.piece.piece_type.name_en },
      karat: o.piece.karat,
      weightG: o.piece.weight_g,
      listingState: o.piece.listing_state,
    },
    seller: { customerId: o.seller.customer_id, displayRef: o.seller.display_ref },
    buyer: { customerId: o.buyer.customer_id, displayRef: o.buyer.display_ref },
    branch: { id: o.branch.id, nameEn: o.branch.name_en },
    value: o.value,
    held: o.held,
    paid: o.paid,
    deadline: o.deadline,
    acceptedAt: o.accepted_at,
    frozen: o.frozen ?? o.state === 'disputed',
    hasWaitingExtension: o.has_waiting_extension ?? false,
    freeRelistStatus: (o.free_relist_status ?? null) as Order['freeRelistStatus'],
  }
}

export function toExtensionRequest (r: ApiExtensionRequest): ExtensionRequest {
  return {
    id: r.id,
    order: r.order
      ? { id: r.order.id, ref: r.order.ref, state: r.order.state, branch: r.order.branch ? { id: r.order.branch.id, nameEn: r.order.branch.name_en } : null }
      : null,
    seller: r.seller ? { customerId: r.seller.customer_id, displayRef: r.seller.display_ref } : null,
    reason: r.reason,
    reasonLabel: r.reason_label,
    detail: r.detail,
    state: r.state,
    deadlineAtRequest: r.deadline_at_request,
    deadlineNow: r.deadline_now,
    secondsLeft: r.seconds_left,
    extensionsBefore: r.extensions_before,
    requestedAt: r.requested_at,
    answeredAt: r.answered_at,
    answeredBy: r.answered_by ? { staffId: r.answered_by.staff_id, name: r.answered_by.name } : null,
    hoursGranted: r.hours_granted,
    answerNote: r.answer_note,
  }
}

function toInspection (r: ApiInspection): InspectionResult {
  return {
    id: r.inspection_id,
    orderId: r.order_id,
    branchId: r.branch_id,
    inspectedBy: r.inspected_by,
    inspectedAt: r.inspected_at,
    statedKarat: r.stated_karat,
    measuredKarat: r.measured_karat,
    statedWeightG: r.stated_weight_g,
    measuredWeightG: r.measured_weight_g,
    weightDiffPct: r.weight_diff_pct,
    measuredStoneGrade: r.measured_stone_grade,
    certificateNumber: r.certificate_number,
    inspectorNote: r.inspector_note,
    karatMismatch: r.karat_mismatch,
    isCounterfeit: r.is_counterfeit,
    stoneBelowClaim: r.stone_below_claim,
    outcome: r.outcome,
    supersedesId: r.supersedes_id,
    superseded: r.superseded ?? false,
  }
}

export function toDetail (o: ApiOrderDetail): OrderDetail {
  const s = o.settlement
  const r = o.seller_return
  return {
    ...toOrder(o),
    lockedTotalPrice: o.locked_total_price,
    depositAmount: o.deposit_amount,
    lockedSellerUnitRate: o.locked_seller_unit_rate,
    lockedBuyerUnitRate: o.locked_buyer_unit_rate,
    settlement: s
      ? {
          finalWeightG: s.final_weight_g,
          finalBuyerTotal: s.final_buyer_total,
          finalSellerGross: s.final_seller_gross,
          commissionAmount: s.commission_amount,
          vatAmount: s.vat_amount,
          spreadAmount: s.spread_amount,
          sellerProceeds: s.seller_proceeds,
          balanceAmount: s.balance_amount,
        }
      : null,
    commissionWaiver: o.commission_waiver?.recorded
      ? {
          kind: o.commission_waiver.kind,
          ordinaryEgp: o.commission_waiver.ordinary_egp,
          chargedEgp: o.commission_waiver.charged_egp,
          givenUpEgp: o.commission_waiver.given_up_egp,
          floorEgp: o.commission_waiver.floor_egp,
          floorApplied: o.commission_waiver.floor_applied,
          code: o.commission_waiver.code,
          spreadGivenUpEgp: o.commission_waiver.spread_given_up_egp,
        }
      : null,
    advance: o.advance
      ? {
          id: o.advance.advance_id,
          amountEgp: o.advance.amount_egp,
          basis: o.advance.basis,
          promoCode: o.advance.promo_code,
          status: o.advance.status,
          advancedAt: o.advance.advanced_at,
          recoveredEgp: o.advance.recovered_egp,
          shortfallAbsorbedEgp: o.advance.shortfall_absorbed_egp,
          writtenOffReason: o.advance.written_off_reason,
        }
      : null,
    inspections: o.inspections.map(i => toInspection(i)),
    latestInspectionId: o.latest_inspection_id,
    proposedPrice: o.proposed_price,
    decisionDueDeadline: o.decision_due_deadline,
    balanceDueDeadline: o.balance_due_deadline,
    reachBranchDeadline: o.reach_branch_deadline,
    collectDeadline: o.collect_deadline,
    collection: o.collection
      ? {
          collectedAt: o.collection.collected_at,
          failedAttempts: o.collection.failed_attempts,
          lockedUntil: o.collection.locked_until,
          proxy: o.collection.proxy
            ? {
                name: o.collection.proxy.name,
                phone: o.collection.proxy.phone,
                namedAt: o.collection.proxy.named_at,
                hasIdPhoto: o.collection.proxy.has_id_photo,
                collectedByProxy: o.collection.proxy.collected_by_proxy,
              }
            : null,
        }
      : null,
    sellerReturn: r
      ? { returnDeadline: r.return_deadline, collectedAt: r.collected_at, relistedAt: r.relisted_at, failedAttempts: r.failed_attempts, lockedUntil: r.locked_until }
      : null,
    cancelReason: o.cancel_reason,
    ledger: o.ledger.map(e => ({ id: e.ledger_txn_id, eventKind: e.event_kind, createdAt: e.created_at, lines: e.lines })),
    timeline: o.timeline,
    disputes: (o.disputes ?? []).map(d => ({
      id: d.id, ref: d.ref, raisedAs: d.raised_as, reason: d.reason, state: d.state, outcome: d.outcome, openedAt: d.opened_at,
    })),
    extensionRequest: o.extension_request ? toExtensionRequest(o.extension_request) : null,
    freeRelist: o.free_relist
      ? { status: o.free_relist.status as FreeRelistStatus, endsAt: o.free_relist.ends_at, listing: o.free_relist.listing }
      : null,
    relistedFromOrder: o.relisted_from_order ? { id: o.relisted_from_order.id, orderRef: o.relisted_from_order.order_ref } : null,
    ratings: o.ratings === undefined
      ? null
      : o.ratings.map(x => ({ partyRole: x.party_role, stars: x.stars, note: x.note, createdAt: x.created_at })),
    can: {
      receive: o.can.receive,
      inspect: o.can.inspect,
      correct: o.can.correct,
      proposePrice: o.can.propose_price,
      changeBranch: o.can.change_branch,
      extend: o.can.extend,
      handover: o.can.handover,
      returnHandover: o.can.return_handover,
      cancel: o.can.cancel,
      handleDispute: o.can.handle_dispute ?? false,
      answerExtension: o.can.answer_extension ?? false,
      viewProxyId: o.can.view_proxy_id ?? false,
    },
  }
}

function toWorkItem (w: ApiWorkListItem): WorkListItem {
  return {
    orderId: w.order_id,
    orderRef: w.order_ref,
    state: w.state,
    task: w.task,
    pieceType: { id: w.piece_type.id, nameEn: w.piece_type.name_en },
    category: w.category,
    statedKarat: w.stated_karat,
    statedWeightG: w.stated_weight_g,
    latestInspection: w.latest_inspection ? toInspection(w.latest_inspection) : null,
    branch: { id: w.branch.id, nameEn: w.branch.name_en },
    since: w.since,
  }
}

function toInspectionRow (r: ApiInspectionRow): InspectionRow {
  return {
    ...toInspection(r),
    orderRef: r.order_ref,
    orderState: r.order_state,
    piece: r.piece
      ? { listingId: r.piece.listing_id, category: r.piece.category, pieceType: { id: r.piece.piece_type.id, nameEn: r.piece.piece_type.name_en } }
      : null,
    sellerRef: r.seller_ref,
    branch: { id: r.branch.id, nameEn: r.branch.name_en },
    receivedAt: r.received_at,
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

// Orders and inspections (Backend spec 012). Every action sends the caller's
// Idempotency-Key, so a retried submission is replayed rather than applied twice.
// An action answers with the order (with order.view) or the work-list item (without):
// callers refetch what they show instead of reading that answer.
export const orderService = {
  // GET /dashboard/orders/export   (order.view, Backend spec 015) — a CSV file with the list's filters; the Backend records each export.
  async exportCsv (filters: OrderFilters): Promise<{ blob: Blob, filename: string, truncated: boolean }> {
    const response = await http.get<Blob>(endpoints.ordersExport, {
      params: {
        group: filters.group,
        past_deadline: filters.pastDeadline ? 1 : undefined,
        branch_id: filters.branchId ?? undefined,
        q: filters.q.trim() === '' ? undefined : filters.q.trim(),
        free_relist: filters.freeRelist ?? undefined,
      },
      responseType: 'blob',
    })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'orders.csv'
    return { blob: response.data, filename, truncated: response.headers['x-export-truncated'] === 'true' }
  },

  // GET /dashboard/orders   (order.view)
  async list (filters: OrderFilters, cursor: string | null, perPage = 25): Promise<OrderPage> {
    const { data } = await http.get<ApiOrderPage>(endpoints.orders, {
      params: {
        group: filters.group,
        past_deadline: filters.pastDeadline ? 1 : undefined,
        branch_id: filters.branchId ?? undefined,
        q: filters.q.trim() === '' ? undefined : filters.q.trim(),
        free_relist: filters.freeRelist ?? undefined,
        cursor: cursor ?? undefined,
        per_page: perPage,
      },
    })
    const c = data.meta.counts
    return {
      rows: data.data.map(o => toOrder(o)),
      nextCursor: data.meta.next_cursor,
      counts: {
        open: c.open,
        waitingSeller: c.waiting_seller,
        atIgi: c.at_igi,
        needsDecision: c.needs_decision,
        waitingBalance: c.waiting_balance,
        readyToCollect: c.ready_to_collect,
        returns: c.returns,
        pastDeadline: c.past_deadline,
      },
    }
  },

  // GET /dashboard/orders/{id}   (order.view) — never a collection code.
  async show (id: string): Promise<OrderDetail> {
    const { data } = await http.get<ApiEnvelope<ApiOrderDetail>>(endpoints.order(id))
    return toDetail(data.data)
  },

  // POST /dashboard/orders/{id}/receive   (order.receive, at the order's branch)
  async receive (id: string, idempotencyKey: string): Promise<void> {
    await http.post(endpoints.orderAction(id, 'receive'), {}, keyHeader(idempotencyKey))
  },

  // POST /dashboard/orders/{id}/inspection-results   (inspection.enter) — the Backend derives the outcome.
  async recordInspection (id: string, input: InspectionInput, idempotencyKey: string): Promise<{ result: InspectionResult, orderState: OrderState }> {
    const body = {
      measured_karat: input.measuredKarat,
      measured_weight_g: input.measuredWeightG,
      measured_stone_grade: input.measuredStoneGrade,
      certificate_number: input.certificateNumber,
      inspector_note: input.inspectorNote,
      is_counterfeit: input.isCounterfeit,
      stone_below_claim: input.stoneBelowClaim,
      supersedes_id: input.supersedesId,
    }
    const { data } = await http.post<ApiEnvelope<{ inspection: ApiInspection, order_state: OrderState }>>(
      endpoints.orderAction(id, 'inspection-results'), body, keyHeader(idempotencyKey))
    return { result: toInspection(data.data.inspection), orderState: data.data.order_state }
  },

  // POST /dashboard/orders/{id}/propose-price   (order.price_adjust) — after a lower stone grade.
  async proposePrice (id: string, price: string, reason: string, idempotencyKey: string): Promise<void> {
    await http.post(endpoints.orderAction(id, 'propose-price'), { price, reason }, keyHeader(idempotencyKey))
  },

  // POST /dashboard/orders/{id}/change-branch   (order.change_branch)
  async changeBranch (id: string, branchId: number, reason: string, extendTo: string | null, idempotencyKey: string): Promise<void> {
    await http.post(endpoints.orderAction(id, 'change-branch'), { branch_id: branchId, reason, extend_to: extendTo }, keyHeader(idempotencyKey))
  },

  // POST /dashboard/orders/{id}/extend-deadline   (order.extend_deadline)
  async extendDeadline (id: string, which: ExtendableDeadline, newDeadline: string, reason: string, idempotencyKey: string): Promise<void> {
    await http.post(endpoints.orderAction(id, 'extend-deadline'), { which, new_deadline: newDeadline, reason }, keyHeader(idempotencyKey))
  },

  // POST /dashboard/orders/{id}/handover | seller-return/handover   (order.handover) — against the 6-digit code.
  // Spec 014: the buyer may have named someone else to collect; then staff confirm they checked that person's ID.
  async handover (id: string, to: 'buyer' | 'seller', code: string, idempotencyKey: string, byProxy = false): Promise<void> {
    const body = to === 'buyer' && byProxy ? { code, collector: 'proxy', proxy_id_checked: true } : { code }
    await http.post(endpoints.orderAction(id, to === 'buyer' ? 'handover' : 'seller-return/handover'), body, keyHeader(idempotencyKey))
  },

  // GET /dashboard/orders/{id}/proxy-id   (order.handover | order.view) — the decrypted ID photo; audited, never cached.
  async proxyId (id: string): Promise<Blob> {
    const response = await http.get<Blob>(endpoints.orderProxyId(id), { responseType: 'blob' })
    return response.data
  },

  // GET /dashboard/extension-requests   (order.extend_deadline | order.view) — oldest first.
  async extensionRequests (state: ExtensionRequestState | 'all', month: string | null, cursor: string | null, perPage = 25): Promise<ExtensionRequestPage> {
    const { data } = await http.get<ApiPage<ApiExtensionRequest>>(endpoints.extensionRequests, {
      params: { state, month: month ?? undefined, cursor: cursor ?? undefined, per_page: perPage },
    })
    return { rows: data.data.map(r => toExtensionRequest(r)), nextCursor: data.meta.next_cursor }
  },

  // POST /dashboard/extension-requests/{id}/accept   (order.extend_deadline)
  async acceptExtension (id: string, hours: ExtensionHours, note: string, idempotencyKey: string): Promise<ExtensionRequest> {
    const { data } = await http.post<ApiEnvelope<ApiExtensionRequest>>(endpoints.extensionRequestAction(id, 'accept'), { hours, note }, keyHeader(idempotencyKey))
    return toExtensionRequest(data.data)
  },

  // POST /dashboard/extension-requests/{id}/refuse   (order.extend_deadline)
  async refuseExtension (id: string, note: string, idempotencyKey: string): Promise<ExtensionRequest> {
    const { data } = await http.post<ApiEnvelope<ApiExtensionRequest>>(endpoints.extensionRequestAction(id, 'refuse'), { note }, keyHeader(idempotencyKey))
    return toExtensionRequest(data.data)
  },

  // GET /dashboard/inspections/work-list   (inspection.enter | order.receive | order.handover)
  async workList (branchId: number | null, cursor: string | null, perPage = 50): Promise<WorkListPage> {
    const { data } = await http.get<ApiPage<ApiWorkListItem>>(endpoints.workList, {
      params: { branch_id: branchId ?? undefined, cursor: cursor ?? undefined, per_page: perPage },
    })
    return { rows: data.data.map(w => toWorkItem(w)), nextCursor: data.meta.next_cursor }
  },

  // GET /dashboard/inspections   (inspection.enter | order.view) — newest first, the last 30 days by default.
  async inspections (filters: InspectionFilters, cursor: string | null, perPage = 25): Promise<InspectionPage> {
    const { data } = await http.get<ApiPage<ApiInspectionRow>>(endpoints.inspections, {
      params: {
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
        branch_id: filters.branchId ?? undefined,
        outcome: filters.outcome ?? undefined,
        cursor: cursor ?? undefined,
        per_page: perPage,
      },
    })
    return { rows: data.data.map(r => toInspectionRow(r)), nextCursor: data.meta.next_cursor }
  },
}
