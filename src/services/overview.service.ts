import type { NeedsDecisionRow, OverviewData, TransactionRow } from '@/types/overview'
import type { StatusVariant } from '@/types/status'
import { http } from '@/api/axios'
import { endpoints } from '@/api/endpoints'
import { orderStateMeta } from '@/types/order'

// Backend shape, spec 015 contracts/finance-ops-api.md: a key is absent when the viewer lacks its permission.
interface ApiOverview {
  earnings?: { month: string, commission: string, spread: string, total: string }
  orders?: Array<{ state: string, count: number, value: string, held_now: string }>
  needs_decision?: Array<{
    kind: string
    id: string
    subject: string | null
    amount: string | null
    waiting_since: string
    waiting_of_kind: number
    acting_permission: string
  }>
  this_month?: { new_sellers: number, pieces_listed: number, sold: number, sell_through_pct: number, avg_days_to_pay_sellers: string | null }
}

// Which Orders group each state opens (GET /dashboard/orders?group=…).
const GROUP_OF: Record<string, string> = {
  awaiting_delivery: 'waiting_seller',
  at_inspection: 'at_igi',
  inspection_passed: 'at_igi',
  weight_adjust_pending: 'needs_decision',
  awaiting_balance: 'waiting_balance',
  ready_to_collect: 'ready_to_collect',
}

function toTransaction (row: NonNullable<ApiOverview['orders']>[number]): TransactionRow {
  const closed = row.state === 'completed' || row.state === 'cancelled'
  const meta = row.state === 'cancelled' ? { label: 'Cancelled', variant: 'bad' as StatusVariant } : orderStateMeta(row.state)
  return {
    status: meta.label,
    statusVariant: meta.variant,
    count: row.count,
    value: row.value,
    heldNow: closed ? null : row.held_now,
    action: row.state === 'completed'
      ? { label: 'Export', kind: 'export', target: 'closed' }
      : { label: row.state === 'cancelled' ? 'Review' : 'Open', kind: 'link', target: row.state === 'disputed'
          ? '/dashboard/disputes'
          : `/dashboard/orders?group=${GROUP_OF[row.state] ?? (closed ? 'closed' : 'open')}` },
  }
}

// What each kind is, where it is worked, and the area that acts on it (from the acting permission).
const KINDS: Record<string, { what: (n: number) => string, area: string, cta: string, target: string }> = {
  listing_review: { what: n => `A listing to review${n > 1 ? `, ${n} waiting` : ''}`, area: 'Listings to review', cta: 'Review', target: '/dashboard/listings' },
  withdrawal: { what: () => 'Withdrawal', area: 'Withdrawals', cta: 'Review', target: '/dashboard/withdrawals' },
  dispute: { what: () => 'Dispute', area: 'Disputes', cta: 'Open', target: '/dashboard/disputes' },
  identity_document: { what: n => `ID verification${n > 1 ? `, ${n} waiting` : ''}`, area: 'Verification', cta: 'Open', target: '/dashboard/users' },
  topup_notice: { what: () => 'Transfer notice to match', area: 'Incoming transfers', cta: 'Match', target: '/dashboard/transfers' },
  payout_account: { what: () => 'Payout account to check', area: 'Payout accounts', cta: 'Check', target: '/dashboard/withdrawals?tab=accounts' },
  extension_request: { what: () => 'More time requested', area: 'Orders', cta: 'Answer', target: '/dashboard/orders' },
}

function waitingVariant (since: string): StatusVariant {
  const hours = (Date.now() - new Date(since).getTime()) / 3_600_000
  return hours >= 24 ? 'bad' : (hours >= 8 ? 'wait' : 'info')
}

function toNeedsDecision (row: NonNullable<ApiOverview['needs_decision']>[number]): NeedsDecisionRow {
  const kind = KINDS[row.kind] ?? { what: () => row.kind.replaceAll('_', ' '), area: row.acting_permission, cta: 'Open', target: '/dashboard/overview' }
  const amount = row.amount === null ? '' : ` ${Number(row.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`
  return {
    id: `${row.kind}:${row.id}`,
    what: `${kind.what(row.waiting_of_kind)}${amount}`,
    whoSub: row.subject ?? '',
    waitingSince: row.waiting_since,
    waitingVariant: waitingVariant(row.waiting_since),
    onWho: kind.area,
    ctaLabel: kind.cta,
    ctaTarget: kind.target,
  }
}

// GET /dashboard/overview (Backend spec 015): any staff member; each section only with its permission.
export async function getOverview (): Promise<OverviewData> {
  const { data } = await http.get<{ data: ApiOverview }>(endpoints.overview)
  const o = data.data
  return {
    earnings: o.earnings ? { commission: o.earnings.commission, spread: o.earnings.spread, total: o.earnings.total } : null,
    transactions: o.orders ? o.orders.map(r => toTransaction(r)) : null,
    needsDecision: o.needs_decision ? o.needs_decision.map(r => toNeedsDecision(r)) : null,
    thisMonth: o.this_month
      ? {
          newSellers: o.this_month.new_sellers,
          piecesListed: o.this_month.pieces_listed,
          sold: o.this_month.sold,
          sellThroughPct: o.this_month.sell_through_pct,
          avgDaysToPaySellers: o.this_month.avg_days_to_pay_sellers,
        }
      : null,
  }
}
