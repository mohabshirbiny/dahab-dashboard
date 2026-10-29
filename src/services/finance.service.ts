import type {
  AdjustmentDirection,
  BankBookPage,
  BankBookRow,
  BankBookSource,
  BankChoice,
  BankMovement,
  BankMovementKind,
  BankMovementPage,
  BankRef,
  CloseDay,
  Compensation,
  CompensationOrder,
  CompensationPage,
  CompensationQuery,
  DailyClose,
  ExportResult,
  PayCompensationInput,
  RecentCloses,
  RecordBankMovementInput,
  WalletAdjustment,
} from '@/types/finance'
import type { AxiosResponse } from 'axios'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 015 contracts/finance-ops-api.md.
interface ApiCompensation {
  id: string
  paid_at: string
  customer: { id: string, display_ref: string | null, name: string | null }
  party: 'buyer' | 'seller' | null
  amount: string
  reason: Compensation['reason']
  reason_label: string
  note: string
  paid_by: { id: string, name: string | null }
  dispute: { id: string, ref: string | null } | null
  order: { id: string, ref: string | null } | null
}

interface ApiCompensationOrder {
  id: string
  order_ref: string
  party: 'buyer' | 'seller'
  state: string
  category: CompensationOrder['category']
  piece_type: { name_en: string | null }
  karat: number | null
  accepted_at: string
}

interface ApiAdjustment {
  id: string
  adjusted_at: string
  customer: { id: string, display_ref: string | null, name: string | null }
  direction: AdjustmentDirection
  amount: string
  reason: string
  customer_status: string
  adjusted_by: { id: string, name: string | null }
}

interface ApiMovement {
  id: string
  number: string
  kind: BankMovementKind
  kind_label: string
  direction: 'in' | 'out'
  amount: string
  occurred_on: string
  reason: string
  has_proof: boolean
  recorded_by: { id: string, name: string | null }
  recorded_at: string
  posts_to_ledger: boolean
  bank?: ApiBank | null
  to_bank?: ApiBank | null
}

interface ApiBank { id: number, label: string | null }

const toBank = (b: ApiBank | null | undefined): BankRef | null => (b ? { id: b.id, label: b.label } : null)

interface ApiBookRow {
  ledger_txn_id: string
  at: string
  kind: string
  direction: 'in' | 'out'
  amount: string
  cash_after: string
  actor: { type: 'staff' | 'system' | 'customer', name: string | null }
  source: Record<string, unknown> & { type: string }
  bank?: ApiBank | null
}

interface ApiClose {
  date: string
  bank_balance: string
  books_bank: string
  customer_available: string
  customer_held: string
  customer_liability: string
  dahab_wallet: string
  movements_in: string
  movements_out: string
  difference: string
  explanation: string | null
  is_locked: boolean
  saved_by: { id: string, name: string | null }
  saved_at: string
  closed_by: { id: string, name: string | null } | null
  closed_at: string | null
  banks?: Array<{ receiving_account_id: number | null, label: string | null, statement_balance: string | null, books: string, difference: string }>
}

interface ApiCompensationPage {
  data: ApiCompensation[]
  meta: {
    next_cursor: string | null
    totals: { period: string, this_month: string }
    caps: { per_payment: string, per_day: string, uncapped: boolean, left_today: string | null }
  }
}

interface ApiClosesPage {
  data: ApiClose[]
  meta: {
    days_closed: number
    days_in_period: number
    last_difference: { date: string, difference: string, explanation: string | null } | null
  }
}

function toCompensation (c: ApiCompensation): Compensation {
  return {
    id: c.id,
    paidAt: c.paid_at,
    customer: { id: c.customer.id, displayRef: c.customer.display_ref, name: c.customer.name },
    party: c.party,
    amount: c.amount,
    reason: c.reason,
    reasonLabel: c.reason_label,
    note: c.note,
    paidBy: c.paid_by,
    dispute: c.dispute,
    order: c.order,
  }
}

function toAdjustment (a: ApiAdjustment): WalletAdjustment {
  return {
    id: a.id,
    adjustedAt: a.adjusted_at,
    customer: { id: a.customer.id, displayRef: a.customer.display_ref, name: a.customer.name },
    direction: a.direction,
    amount: a.amount,
    reason: a.reason,
    customerStatus: a.customer_status,
    adjustedBy: a.adjusted_by,
  }
}

function toMovement (m: ApiMovement): BankMovement {
  return {
    id: m.id,
    number: m.number,
    kind: m.kind,
    kindLabel: m.kind_label,
    direction: m.direction,
    amount: m.amount,
    occurredOn: m.occurred_on,
    reason: m.reason,
    hasProof: m.has_proof,
    recordedBy: m.recorded_by,
    recordedAt: m.recorded_at,
    postsToLedger: m.posts_to_ledger,
    bank: toBank(m.bank),
    toBank: toBank(m.to_bank),
  }
}

function toSource (s: ApiBookRow['source']): BankBookSource {
  const str = (key: string) => (typeof s[key] === 'string' ? s[key] as string : null)
  switch (s.type) {
    case 'topup': {
      return { type: 'topup', id: str('id'), number: str('number'), reference: str('reference'), customerRef: str('customer_ref'),
        how: str('how') as 'matched_notice' | 'credited_by_hand' | null, receivingAccount: str('receiving_account') }
    }
    case 'withdrawal': {
      return { type: 'withdrawal', id: str('id') ?? '', number: str('number') ?? '', customerRef: str('customer_ref'), bankTxnNumber: str('bank_txn_number') }
    }
    case 'bank_movement': {
      return { type: 'bank_movement', id: str('id') ?? '', number: str('number') ?? '', kind: str('kind') as BankMovementKind,
        kindLabel: str('kind_label') ?? '', reason: str('reason') ?? '', occurredOn: str('occurred_on') ?? '', hasProof: s.has_proof === true }
    }
    case 'reversal': {
      return { type: 'reversal', reversesTxnId: str('reverses_txn_id'), memo: str('memo') }
    }
  }
  return { type: 'other', memo: str('memo') }
}

function toBookRow (r: ApiBookRow): BankBookRow {
  return {
    ledgerTxnId: r.ledger_txn_id,
    at: r.at,
    kind: r.kind,
    direction: r.direction,
    amount: r.amount,
    cashAfter: r.cash_after,
    actor: r.actor,
    source: toSource(r.source),
    bank: toBank(r.bank),
  }
}

function toClose (c: ApiClose): DailyClose {
  return {
    date: c.date,
    bankBalance: c.bank_balance,
    booksBank: c.books_bank,
    customerAvailable: c.customer_available,
    customerHeld: c.customer_held,
    customerLiability: c.customer_liability,
    dahabWallet: c.dahab_wallet,
    movementsIn: c.movements_in,
    movementsOut: c.movements_out,
    difference: c.difference,
    explanation: c.explanation,
    isLocked: c.is_locked,
    savedBy: c.saved_by,
    savedAt: c.saved_at,
    closedBy: c.closed_by,
    closedAt: c.closed_at,
    banks: (c.banks ?? []).map(l => ({
      receivingAccountId: l.receiving_account_id, label: l.label, statementBalance: l.statement_balance, books: l.books, difference: l.difference,
    })),
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })
const blank = (v: string | null | undefined) => (v === null || v === undefined || v.trim() === '' ? undefined : v.trim())

function toExport (response: AxiosResponse<Blob>, fallback: string): ExportResult {
  const disposition = String(response.headers['content-disposition'] ?? '')
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallback
  return { blob: response.data, filename, truncated: response.headers['x-export-truncated'] === 'true' }
}

const compensationParams = (q: CompensationQuery) => ({ from: blank(q.from), to: blank(q.to), reason: blank(q.reason), customer_id: q.customerId ?? undefined })

// Finance operations (Backend spec 015). Every POST sends the caller's Idempotency-Key,
// so a retried submission is replayed rather than applied twice.
export const financeService = {
  // GET /dashboard/compensation   (compensation.pay or wallet.view)
  async compensation (query: CompensationQuery, cursor: string | null, perPage = 25): Promise<CompensationPage> {
    const { data } = await http.get<ApiCompensationPage>(endpoints.compensation,
      { params: { ...compensationParams(query), cursor: cursor ?? undefined, per_page: perPage } })
    const caps = data.meta.caps
    return {
      rows: data.data.map(c => toCompensation(c)),
      nextCursor: data.meta.next_cursor,
      totals: { period: data.meta.totals.period, thisMonth: data.meta.totals.this_month },
      caps: { perPayment: caps.per_payment, perDay: caps.per_day, uncapped: caps.uncapped, leftToday: caps.left_today },
    }
  },

  async exportCompensation (query: CompensationQuery): Promise<ExportResult> {
    return toExport(await http.get<Blob>(endpoints.compensationExport, { params: compensationParams(query), responseType: 'blob' }), 'compensation.csv')
  },

  // GET /dashboard/compensation/orders?customer_id=   (compensation.pay) — the orders a payment can name.
  async compensationOrders (customerId: string): Promise<CompensationOrder[]> {
    const { data } = await http.get<{ data: ApiCompensationOrder[] }>(endpoints.compensationOrders, { params: { customer_id: customerId } })
    return data.data.map(o => ({
      id: o.id, orderRef: o.order_ref, party: o.party, state: o.state, category: o.category,
      pieceTypeName: o.piece_type?.name_en ?? null, karat: o.karat, acceptedAt: o.accepted_at,
    }))
  },

  // POST /dashboard/compensation   (compensation.pay)
  async payCompensation (input: PayCompensationInput, idempotencyKey: string): Promise<Compensation> {
    const { data } = await http.post<{ data: ApiCompensation }>(endpoints.compensation, {
      customer_id: input.customerId, amount: input.amount, reason: input.reason, note: input.note, order_id: input.orderId,
    }, keyHeader(idempotencyKey))
    return toCompensation(data.data)
  },

  // POST /dashboard/customers/{id}/wallet-adjustments   (wallet.adjust)
  async adjustWallet (customerId: string, direction: AdjustmentDirection, amount: string, reason: string, idempotencyKey: string): Promise<WalletAdjustment> {
    const { data } = await http.post<{ data: ApiAdjustment }>(endpoints.customerWalletAdjust(customerId), { direction, amount, reason }, keyHeader(idempotencyKey))
    return toAdjustment(data.data)
  },

  // GET /dashboard/wallet-adjustments   (wallet.adjust or wallet.view)
  async adjustments (customerId: string | null): Promise<WalletAdjustment[]> {
    const { data } = await http.get<{ data: ApiAdjustment[] }>(endpoints.walletAdjustments, { params: { customer_id: customerId ?? undefined, per_page: 50 } })
    return data.data.map(a => toAdjustment(a))
  },

  // POST /dashboard/uploads   (bank.record) — a single-use token for the proof.
  async uploadProof (file: File): Promise<string> {
    const form = new FormData()
    form.append('purpose', 'bank_movement_proof')
    form.append('file', file)
    const { data } = await http.post<{ data: { token: string } }>(endpoints.staffUploads, form)
    return data.data.token
  },

  // POST /dashboard/bank-movements   (bank.record)
  async recordMovement (input: RecordBankMovementInput, idempotencyKey: string): Promise<BankMovement> {
    const { data } = await http.post<{ data: ApiMovement }>(endpoints.bankMovements, {
      kind: input.kind, direction: input.direction, amount: input.amount, occurred_on: input.occurredOn, reason: input.reason,
      proof_upload_token: input.proofUploadToken,
      receiving_account_id: input.receivingAccountId, to_receiving_account_id: input.kind === 'own_transfer' ? input.toReceivingAccountId : undefined,
    }, keyHeader(idempotencyKey))
    return toMovement(data.data)
  },

  // GET /dashboard/bank-movements   (bank.record or wallet.view)
  async movements (from: string, to: string, kind: BankMovementKind | '', cursor: string | null): Promise<BankMovementPage> {
    const { data } = await http.get<{ data: ApiMovement[], meta: { next_cursor: string | null, totals: { in: string, out: string } } }>(
      endpoints.bankMovements, { params: { from: blank(from), to: blank(to), kind: blank(kind), cursor: cursor ?? undefined, per_page: 25 } })
    return { rows: data.data.map(m => toMovement(m)), nextCursor: data.meta.next_cursor, totals: data.meta.totals }
  },

  async exportMovements (from: string, to: string, kind: BankMovementKind | ''): Promise<ExportResult> {
    return toExport(await http.get<Blob>(endpoints.bankMovementsExport, { params: { from: blank(from), to: blank(to), kind: blank(kind) }, responseType: 'blob' }), 'bank-movements.csv')
  },

  async proof (id: string): Promise<Blob> {
    const response = await http.get<Blob>(endpoints.bankMovementProof(id), { responseType: 'blob' })
    return response.data
  },

  // GET /dashboard/bank-book   (bank.record or wallet.view)
  async bankBook (from: string, to: string, cursor: string | null): Promise<BankBookPage> {
    const { data } = await http.get<{ data: ApiBookRow[], meta: { next_cursor: string | null, summary: BankBookPage['summary'] } }>(
      endpoints.bankBook, { params: { from: blank(from), to: blank(to), cursor: cursor ?? undefined, per_page: 50 } })
    return { rows: data.data.map(r => toBookRow(r)), nextCursor: data.meta.next_cursor, summary: data.meta.summary }
  },

  async exportBankBook (from: string, to: string): Promise<ExportResult> {
    return toExport(await http.get<Blob>(endpoints.bankBookExport, { params: { from: blank(from), to: blank(to) }, responseType: 'blob' }), 'bank-book.csv')
  },

  // GET /dashboard/banks   (bank.record, wallet.view, withdrawal.release or day.close)
  async banks (): Promise<BankChoice[]> {
    const { data } = await http.get<{ data: Array<{ id: number, label: string, bank_name: string | null, method: BankChoice['method'], is_active: boolean }> }>(endpoints.banks)
    return data.data.map(b => ({ id: b.id, label: b.label, bankName: b.bank_name, method: b.method, isActive: b.is_active }))
  },

  // GET /dashboard/daily-close   (day.close or wallet.view)
  async day (date: string | null): Promise<CloseDay> {
    const { data } = await http.get<{ data: {
      date: string
      ended: boolean
      books: Record<string, string>
      banks?: Array<{ receiving_account_id: number, label: string, bank_name: string | null, is_active: boolean, books: string }>
      not_assigned?: string
      close: ApiClose | null
      can_close: boolean
    } }>(
      endpoints.dailyClose, { params: { date: date ?? undefined } })
    const b = data.data.books
    return {
      date: data.data.date,
      ended: data.data.ended,
      books: {
        bank: b.bank ?? '0', customerAvailable: b.customer_available ?? '0', customerHeld: b.customer_held ?? '0',
        customerLiability: b.customer_liability ?? '0', dahabWallet: b.dahab_wallet ?? '0', escrow: b.escrow ?? '0',
        vatPayable: b.vat_payable ?? '0', movementsIn: b.movements_in ?? '0', movementsOut: b.movements_out ?? '0',
      },
      banks: (data.data.banks ?? []).map(b => ({ receivingAccountId: b.receiving_account_id, label: b.label, bankName: b.bank_name, isActive: b.is_active, books: b.books })),
      notAssigned: data.data.not_assigned ?? '0.0000',
      close: data.data.close ? toClose(data.data.close) : null,
      canClose: data.data.can_close,
    }
  },

  // GET /dashboard/daily-closes   (day.close or wallet.view)
  async recentCloses (from: string, to: string): Promise<RecentCloses> {
    const { data } = await http.get<ApiClosesPage>(endpoints.dailyCloses, { params: { from: blank(from), to: blank(to) } })
    return { rows: data.data.map(c => toClose(c)), daysClosed: data.meta.days_closed, daysInPeriod: data.meta.days_in_period, lastDifference: data.meta.last_difference }
  },

  // POST /dashboard/daily-close   (day.close)
  // One statement balance per account (owner notes of 2026-10-29).
  async closeDay (date: string, balances: Array<{ receivingAccountId: number, balance: string }>, explanation: string | null, idempotencyKey: string): Promise<{ state: 'locked' | 'saved', close: DailyClose }> {
    const { data } = await http.post<{ data: { state: 'locked' | 'saved', close: ApiClose } }>(endpoints.dailyClose,
      { date, bank_balances: balances.map(b => ({ receiving_account_id: b.receivingAccountId, balance: b.balance })), explanation }, keyHeader(idempotencyKey))
    return { state: data.data.state, close: toClose(data.data.close) }
  },
}
