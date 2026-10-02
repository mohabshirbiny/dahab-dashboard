import type { ApiEnvelope } from '@/types/api'
import type { ListingCategory, ListingState } from '@/types/listing'
import type {
  ExtendableDeadline,
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

interface ApiOrderDetail extends ApiOrder {
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
  inspections: ApiInspection[]
  latest_inspection_id: string | null
  proposed_price: string | null
  decision_due_deadline: string | null
  balance_due_deadline: string | null
  reach_branch_deadline: string
  collect_deadline: string | null
  collection: { collected_at: string | null, handover_by: string | null, failed_attempts: number, locked_until: string | null } | null
  seller_return: { return_deadline: string, collected_at: string | null, relisted_at: string | null, compensation_txn_id: string | null, failed_attempts: number, locked_until: string | null } | null
  cancel_reason: string | null
  ledger: Array<{ ledger_txn_id: string, event_kind: string, created_at: string, lines: Array<{ account: string, party: 'buyer' | 'seller' | 'dahab' | 'other', amount: string }> }>
  timeline: Array<{ event: string, at: string, detail: Record<string, unknown> }>
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

function toDetail (o: ApiOrderDetail): OrderDetail {
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
    inspections: o.inspections.map(i => toInspection(i)),
    latestInspectionId: o.latest_inspection_id,
    proposedPrice: o.proposed_price,
    decisionDueDeadline: o.decision_due_deadline,
    balanceDueDeadline: o.balance_due_deadline,
    reachBranchDeadline: o.reach_branch_deadline,
    collectDeadline: o.collect_deadline,
    collection: o.collection
      ? { collectedAt: o.collection.collected_at, failedAttempts: o.collection.failed_attempts, lockedUntil: o.collection.locked_until }
      : null,
    sellerReturn: r
      ? { returnDeadline: r.return_deadline, collectedAt: r.collected_at, relistedAt: r.relisted_at, failedAttempts: r.failed_attempts, lockedUntil: r.locked_until }
      : null,
    cancelReason: o.cancel_reason,
    ledger: o.ledger.map(e => ({ id: e.ledger_txn_id, eventKind: e.event_kind, createdAt: e.created_at, lines: e.lines })),
    timeline: o.timeline,
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
  // GET /dashboard/orders   (order.view)
  async list (filters: OrderFilters, cursor: string | null, perPage = 25): Promise<OrderPage> {
    const { data } = await http.get<ApiOrderPage>(endpoints.orders, {
      params: {
        group: filters.group,
        past_deadline: filters.pastDeadline ? 1 : undefined,
        branch_id: filters.branchId ?? undefined,
        q: filters.q.trim() === '' ? undefined : filters.q.trim(),
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
  async handover (id: string, to: 'buyer' | 'seller', code: string, idempotencyKey: string): Promise<void> {
    await http.post(endpoints.orderAction(id, to === 'buyer' ? 'handover' : 'seller-return/handover'), { code }, keyHeader(idempotencyKey))
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
