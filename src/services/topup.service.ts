import type { ApiEnvelope } from '@/types/api'
import type {
  CreditByHandInput,
  MatchTopUpInput,
  ReceivingAccount,
  ReceivingAccountInput,
  TopUp,
  TopUpAccountRef,
  TopUpListQuery,
  TopUpMethod,
  TopUpPage,
  TopUpRejectReason,
  TopUpStaffRef,
} from '@/types/topup'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'

// Backend shapes (snake_case), spec 009 contracts/topup-api.md.
interface ApiStaffRef { id: string, full_name: string }
interface ApiAccountRef { id: number, method: TopUpMethod, label: string, provider_fee_percent?: string | null }

interface ApiTopUp {
  id: string
  number: string
  origin: TopUp['origin']
  method: TopUpMethod
  reference: string
  status: TopUp['status']
  claimed_amount: string | null
  expected_amount: string | null
  notice_fee_percent: string | null
  credited_amount: string | null
  has_receipt: boolean
  submitted_at: string
  customer: { id: string, display_ref: string, full_name: string | null, phone: string | null, status: string }
  notice_account: ApiAccountRef | null
  receiving_account: ApiAccountRef | null
  hold_note: string | null
  held_by: ApiStaffRef | null
  held_at: string | null
  reject_reason: TopUpRejectReason | null
  reject_note: string | null
  rejected_by: ApiStaffRef | null
  rejected_at: string | null
  cancelled_at: string | null
  credit_note: string | null
  arrival_reference: string | null
  credited_by: ApiStaffRef | null
  credited_at: string | null
  ledger_txn_id: string | null
  allowed_actions: TopUp['allowedActions']
}

interface ApiTopUpPage {
  data: ApiTopUp[]
  meta: { per_page: number, next_cursor: string | null, totals: { count: number, claimed: string } }
}

interface ApiReceivingAccount {
  id: number
  method: TopUpMethod
  label: string
  bank_name: string | null
  account_holder: string | null
  account_number: string | null
  iban: string | null
  instapay_address: string | null
  wallet_number: string | null
  daily_limit: string | null
  provider_fee_percent: string | null
  customer_note: string | null
  sort_order: number
  is_active: boolean
  updated_at: string
  updated_by: ApiStaffRef | null
}

const staff = (s: ApiStaffRef | null): TopUpStaffRef | null => (s ? { id: s.id, fullName: s.full_name } : null)
function account (a: ApiAccountRef | null): TopUpAccountRef | null {
  return a ? { id: a.id, method: a.method, label: a.label, providerFeePercent: a.provider_fee_percent ?? null } : null
}

function toTopUp (t: ApiTopUp): TopUp {
  return {
    id: t.id,
    number: t.number,
    origin: t.origin,
    method: t.method,
    reference: t.reference,
    status: t.status,
    claimedAmount: t.claimed_amount,
    expectedAmount: t.expected_amount,
    noticeFeePercent: t.notice_fee_percent,
    creditedAmount: t.credited_amount,
    hasReceipt: t.has_receipt,
    submittedAt: t.submitted_at,
    customer: { id: t.customer.id, displayRef: t.customer.display_ref, fullName: t.customer.full_name, phone: t.customer.phone, status: t.customer.status },
    noticeAccount: account(t.notice_account),
    receivingAccount: account(t.receiving_account),
    holdNote: t.hold_note,
    heldBy: staff(t.held_by),
    heldAt: t.held_at,
    rejectReason: t.reject_reason,
    rejectNote: t.reject_note,
    rejectedBy: staff(t.rejected_by),
    rejectedAt: t.rejected_at,
    cancelledAt: t.cancelled_at,
    creditNote: t.credit_note,
    arrivalReference: t.arrival_reference,
    creditedBy: staff(t.credited_by),
    creditedAt: t.credited_at,
    ledgerTxnId: t.ledger_txn_id,
    allowedActions: t.allowed_actions,
  }
}

function toAccount (a: ApiReceivingAccount): ReceivingAccount {
  return {
    id: a.id,
    method: a.method,
    label: a.label,
    bankName: a.bank_name,
    accountHolder: a.account_holder,
    accountNumber: a.account_number,
    iban: a.iban,
    instapayAddress: a.instapay_address,
    walletNumber: a.wallet_number,
    dailyLimit: a.daily_limit,
    providerFeePercent: a.provider_fee_percent,
    customerNote: a.customer_note,
    sortOrder: a.sort_order,
    isActive: a.is_active,
    updatedAt: a.updated_at,
    updatedBy: staff(a.updated_by),
  }
}

function toAccountBody (input: Partial<ReceivingAccountInput>) {
  const body: Record<string, unknown> = {}
  const map: Record<keyof ReceivingAccountInput, string> = {
    label: 'label',
    bankName: 'bank_name',
    accountHolder: 'account_holder',
    accountNumber: 'account_number',
    iban: 'iban',
    instapayAddress: 'instapay_address',
    walletNumber: 'wallet_number',
    dailyLimit: 'daily_limit',
    providerFeePercent: 'provider_fee_percent',
    customerNote: 'customer_note',
    sortOrder: 'sort_order',
    isActive: 'is_active',
  }
  for (const [key, field] of Object.entries(map) as Array<[keyof ReceivingAccountInput, string]>) {
    if (input[key] !== undefined) {
      body[field] = input[key]
    }
  }
  return body
}

function listParams (query: TopUpListQuery) {
  return {
    status: query.statuses.join(','),
    from: query.from,
    to: query.to,
    q: query.q.trim() === '' ? undefined : query.q.trim(),
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

// Incoming transfers and receiving accounts (Backend spec 009). Every POST that
// moves money or changes a transfer sends the caller's Idempotency-Key, so a
// retried submission is replayed rather than applied twice.
export const topUpService = {
  // GET /dashboard/topups   (topup.match)
  async list (query: TopUpListQuery, cursor: string | null, perPage = 25): Promise<TopUpPage> {
    const { data } = await http.get<ApiTopUpPage>(endpoints.topUps, { params: { ...listParams(query), cursor: cursor ?? undefined, per_page: perPage } })
    return { rows: data.data.map(t => toTopUp(t)), nextCursor: data.meta.next_cursor, totals: data.meta.totals }
  },

  // GET /dashboard/topups/{id}
  async show (id: string): Promise<TopUp> {
    const { data } = await http.get<ApiEnvelope<ApiTopUp>>(endpoints.topUp(id))
    return toTopUp(data.data)
  },

  // GET /dashboard/topups/{id}/receipt — the decrypted image or PDF.
  async receipt (id: string): Promise<Blob> {
    const response = await http.get<Blob>(endpoints.topUpReceipt(id), { responseType: 'blob' })
    return response.data
  },

  // GET /dashboard/topups/export — a CSV file; the Backend records each export.
  async exportCsv (query: TopUpListQuery): Promise<{ blob: Blob, filename: string, truncated: boolean }> {
    const response = await http.get<Blob>(endpoints.topUpsExport, { params: listParams(query), responseType: 'blob' })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'incoming-transfers.csv'
    return { blob: response.data, filename, truncated: response.headers['x-export-truncated'] === 'true' }
  },

  // POST /dashboard/topups/{id}/match — credits what arrived (moves money).
  async match (id: string, input: MatchTopUpInput, idempotencyKey: string): Promise<TopUp> {
    const { data } = await http.post<ApiEnvelope<ApiTopUp>>(endpoints.topUpAction(id, 'match'), {
      amount: input.amount,
      receiving_account_id: input.receivingAccountId,
      note: input.note,
      arrival_reference: input.arrivalReference,
    }, keyHeader(idempotencyKey))
    return toTopUp(data.data)
  },

  async hold (id: string, note: string, idempotencyKey: string): Promise<TopUp> {
    const { data } = await http.post<ApiEnvelope<ApiTopUp>>(endpoints.topUpAction(id, 'hold'), { note }, keyHeader(idempotencyKey))
    return toTopUp(data.data)
  },

  async unhold (id: string, idempotencyKey: string): Promise<TopUp> {
    const { data } = await http.post<ApiEnvelope<ApiTopUp>>(endpoints.topUpAction(id, 'unhold'), {}, keyHeader(idempotencyKey))
    return toTopUp(data.data)
  },

  async reject (id: string, input: { reason: TopUpRejectReason, note: string }, idempotencyKey: string): Promise<TopUp> {
    const { data } = await http.post<ApiEnvelope<ApiTopUp>>(endpoints.topUpAction(id, 'reject'), input, keyHeader(idempotencyKey))
    return toTopUp(data.data)
  },

  // POST /dashboard/topups — money that arrived without a notice (moves money).
  async creditByHand (input: CreditByHandInput, idempotencyKey: string): Promise<TopUp> {
    const { data } = await http.post<ApiEnvelope<ApiTopUp>>(endpoints.topUps, {
      customer_id: input.customerId,
      amount: input.amount,
      receiving_account_id: input.receivingAccountId,
      note: input.note,
      arrival_reference: input.arrivalReference,
    }, keyHeader(idempotencyKey))
    return toTopUp(data.data)
  },

  // GET /dashboard/receiving-accounts   (topup.match or topup.accounts.manage)
  async receivingAccounts (includeInactive: boolean): Promise<ReceivingAccount[]> {
    const { data } = await http.get<ApiEnvelope<ApiReceivingAccount[]>>(endpoints.receivingAccounts, { params: { include_inactive: includeInactive ? 1 : undefined } })
    return data.data.map(a => toAccount(a))
  },

  // POST /dashboard/receiving-accounts   (topup.accounts.manage)
  async createAccount (method: TopUpMethod, input: ReceivingAccountInput): Promise<ReceivingAccount> {
    const { data } = await http.post<ApiEnvelope<ApiReceivingAccount>>(endpoints.receivingAccounts, { method, ...toAccountBody(input) })
    return toAccount(data.data)
  },

  // PATCH /dashboard/receiving-accounts/{id}   (topup.accounts.manage; the method never changes)
  async updateAccount (id: number, input: Partial<ReceivingAccountInput>): Promise<ReceivingAccount> {
    const { data } = await http.patch<ApiEnvelope<ApiReceivingAccount>>(endpoints.receivingAccount(id), toAccountBody(input))
    return toAccount(data.data)
  },
}
