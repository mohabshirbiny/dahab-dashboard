import type { ApiEnvelope, ApiPayoutAccount } from '@/types/api'
import type {
  PayoutAccount,
  PayoutAccountPage,
  PayoutAccountState,
  PayoutRefusalReason,
  Withdrawal,
  WithdrawalHoldReason,
  WithdrawalListQuery,
  WithdrawalPage,
  WithdrawalRejectReason,
} from '@/types/withdrawal'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'
import { SCOPE_STATES } from '@/types/withdrawal'

// Backend shapes (snake_case), spec 013 contracts/withdrawals-api.md.
interface ApiWithdrawal {
  id: string
  number: string
  amount: string
  state: Withdrawal['state']
  requested_at: string
  review_started_at: string | null
  reviewer: { id: string, full_name: string } | null
  hold: { on_hold: boolean, reason: WithdrawalHoldReason, message: string, note: string, by: string | null, at: string } | null
  customer: { id: string, display_ref: string | null, full_name: string | null, available: string }
  account: ApiPayoutAccount | null
  signals: {
    identity_verified: boolean
    suspended: boolean
    account_added_at: string | null
    first_payout_to_account: boolean
    payouts_to_account: number
    in_use_changed_at: string | null
    completed_sales: number
    topped_up_never_traded: boolean
  } | []
  released_at: string | null
  bank_txn_number: string | null
  transfer_reference: string | null
  value_date: string | null
  rejection: { reason: WithdrawalRejectReason, note: string } | null
  cancelled_by_change: boolean
  can: Withdrawal['can']
  ledger?: Array<{ id: string, kind: 'hold' | 'release' | 'return', created_at: string, lines: Array<{ account: string, amount: string }> }>
}

interface ApiWithdrawalPage {
  data: ApiWithdrawal[]
  meta: {
    per_page: number
    next_cursor: string | null
    figures: {
      waiting_count: number
      waiting_sum: string
      released_today_count: number
      released_today_sum: string
      on_hold_count: number
      avg_hours_to_release: string | null
    }
  }
}

export function toPayoutAccount (a: ApiPayoutAccount): PayoutAccount {
  return {
    id: a.id,
    bankName: a.bank_name,
    accountName: a.account_name,
    number: a.number,
    numberMasked: a.number_masked,
    kind: a.kind,
    state: a.state,
    inUse: a.in_use,
    addedAt: a.added_at,
    checked: a.checked,
    refusal: a.refusal,
    customer: a.customer
      ? { id: a.customer.id, displayRef: a.customer.display_ref, fullName: a.customer.full_name, identityVerified: a.customer.identity_verified, suspended: a.customer.suspended }
      : null,
  }
}

function toWithdrawal (w: ApiWithdrawal): Withdrawal {
  const s = Array.isArray(w.signals) ? null : w.signals
  return {
    id: w.id,
    number: w.number,
    amount: w.amount,
    state: w.state,
    requestedAt: w.requested_at,
    reviewStartedAt: w.review_started_at,
    reviewer: w.reviewer ? { id: w.reviewer.id, fullName: w.reviewer.full_name } : null,
    hold: w.hold ? { onHold: w.hold.on_hold, reason: w.hold.reason, message: w.hold.message, note: w.hold.note, by: w.hold.by, at: w.hold.at } : null,
    customer: { id: w.customer.id, displayRef: w.customer.display_ref, fullName: w.customer.full_name, available: w.customer.available },
    account: w.account ? toPayoutAccount(w.account) : null,
    signals: s
      ? {
          identityVerified: s.identity_verified,
          suspended: s.suspended,
          accountAddedAt: s.account_added_at,
          firstPayoutToAccount: s.first_payout_to_account,
          payoutsToAccount: s.payouts_to_account,
          inUseChangedAt: s.in_use_changed_at,
          completedSales: s.completed_sales,
          toppedUpNeverTraded: s.topped_up_never_traded,
        }
      : null,
    releasedAt: w.released_at,
    bankTxnNumber: w.bank_txn_number,
    transferReference: w.transfer_reference,
    valueDate: w.value_date,
    rejection: w.rejection,
    cancelledByChange: w.cancelled_by_change,
    can: w.can,
    ledger: (w.ledger ?? []).map(e => ({ id: e.id, kind: e.kind, createdAt: e.created_at, lines: e.lines })),
  }
}

function listParams (query: WithdrawalListQuery) {
  return {
    state: SCOPE_STATES[query.scope].join(','),
    held: query.scope === 'held' ? 1 : undefined,
    from: query.from || undefined,
    to: query.to || undefined,
    q: query.q.trim() === '' ? undefined : query.q.trim(),
    customer_id: query.customerId,
  }
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })

export type WithdrawalAction
  = | { kind: 'review' }
    | { kind: 'hold', reason: WithdrawalHoldReason, message: string, note: string }
    | { kind: 'unhold', note?: string }
    | { kind: 'release', bankTxnNumber: string, transferReference: string, valueDate: string }
    | { kind: 'reject', reason: WithdrawalRejectReason, note: string }

function actionBody (action: WithdrawalAction): Record<string, unknown> {
  switch (action.kind) {
    case 'hold': { return { reason: action.reason, message: action.message, note: action.note } }
    case 'unhold': { return action.note ? { note: action.note } : {} }
    case 'release': {
      return { bank_txn_number: action.bankTxnNumber, transfer_reference: action.transferReference || null, value_date: action.valueDate || null }
    }
    case 'reject': { return { reason: action.reason, note: action.note } }
  }
  return {}
}

// The Withdrawals page and payout accounts to check (Backend spec 013). Every POST
// sends the caller's Idempotency-Key, so a retried submission is replayed, not repeated.
export const withdrawalService = {
  // GET /dashboard/withdrawals   (withdrawal.release, or wallet.view read-only)
  async list (query: WithdrawalListQuery, cursor: string | null, perPage = 25): Promise<WithdrawalPage> {
    const { data } = await http.get<ApiWithdrawalPage>(endpoints.withdrawals, { params: { ...listParams(query), cursor: cursor ?? undefined, per_page: perPage } })
    const f = data.meta.figures
    return {
      rows: data.data.map(w => toWithdrawal(w)),
      nextCursor: data.meta.next_cursor,
      figures: {
        waitingCount: f.waiting_count,
        waitingSum: f.waiting_sum,
        releasedTodayCount: f.released_today_count,
        releasedTodaySum: f.released_today_sum,
        onHoldCount: f.on_hold_count,
        avgHoursToRelease: f.avg_hours_to_release,
      },
    }
  },

  async show (id: string): Promise<Withdrawal> {
    const { data } = await http.get<ApiEnvelope<ApiWithdrawal>>(endpoints.withdrawal(id))
    return toWithdrawal(data.data)
  },

  async act (id: string, action: WithdrawalAction, idempotencyKey: string): Promise<Withdrawal> {
    const { data } = await http.post<ApiEnvelope<ApiWithdrawal>>(endpoints.withdrawalAction(id, action.kind), actionBody(action), keyHeader(idempotencyKey))
    return toWithdrawal(data.data)
  },

  // GET /dashboard/withdrawals/export — a CSV file; the Backend records each export.
  async exportCsv (query: WithdrawalListQuery): Promise<{ blob: Blob, filename: string, truncated: boolean }> {
    const response = await http.get<Blob>(endpoints.withdrawalsExport, { params: listParams(query), responseType: 'blob' })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'withdrawals.csv'
    return { blob: response.data, filename, truncated: response.headers['x-export-truncated'] === 'true' }
  },

  // GET /dashboard/payout-accounts   (payout_account.verify)
  async payoutAccounts (state: PayoutAccountState, q: string, cursor: string | null, perPage = 25): Promise<PayoutAccountPage> {
    const { data } = await http.get<{ data: ApiPayoutAccount[], meta: { next_cursor: string | null, waiting: number } }>(endpoints.payoutAccounts, {
      params: { state, q: q.trim() === '' ? undefined : q.trim(), cursor: cursor ?? undefined, per_page: perPage },
    })
    return { rows: data.data.map(a => toPayoutAccount(a)), nextCursor: data.meta.next_cursor, waiting: data.meta.waiting }
  },

  async verifyAccount (id: string, idempotencyKey: string): Promise<{ account: PayoutAccount, pauseUntil: string | null, cancelled: string[] }> {
    const { data } = await http.post<{ data: ApiPayoutAccount, meta: { pause_until: string | null, cancelled_withdrawals: string[] } }>(
      endpoints.payoutAccountAction(id, 'verify'), {}, keyHeader(idempotencyKey))
    return { account: toPayoutAccount(data.data), pauseUntil: data.meta.pause_until, cancelled: data.meta.cancelled_withdrawals }
  },

  async refuseAccount (id: string, reason: PayoutRefusalReason, note: string, idempotencyKey: string): Promise<PayoutAccount> {
    const { data } = await http.post<ApiEnvelope<ApiPayoutAccount>>(endpoints.payoutAccountAction(id, 'refuse'), { reason, note }, keyHeader(idempotencyKey))
    return toPayoutAccount(data.data)
  },
}
