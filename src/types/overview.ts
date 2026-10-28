import type { CustomerCounts } from './customer'
import type { StatusVariant } from './status'

export interface OverviewHeroStat {
  label: string
  value: string
  valueColor?: string
  hint: string
}

export interface OverviewStat {
  label: string
  value: string
  valueColor?: string
  hint: string
}

export interface TransactionRow {
  status: string
  statusVariant: StatusVariant
  count: number
  value: string
  heldNow: string | null
  action: {
    label: string
    kind: 'link' | 'export'
    // A route for links; the Orders group for exports.
    target: string
  }
}

export interface NeedsDecisionRow {
  id: string
  what: string
  whoSub: string
  waitingSince: string
  waitingVariant: StatusVariant
  // The area the acting permission belongs to (never a role name: roles are Dashboard data).
  onWho: string
  ctaLabel: string
  ctaTarget: string
}

// Live from the ledger (Backend spec 008): 4-place decimal strings.
export interface CustomerWallets {
  available: string
  heldOnOpenOrders: string
  // Backend spec 013: requested or under review, not yet sent to the bank.
  pendingWithdrawals: string
  totalOwed: string
}

export interface GoldPriceSnapshot {
  sellersGet21k: string | null
  buyersPay21k: string | null
  differencePerGram: string | null
  feedStatus: { label: string, variant: StatusVariant }
  lastUpdated: string | null
}

export interface ThisMonth {
  newSellers: number
  piecesListed: number
  sold: number
  sellThroughPct: number
  avgDaysToPaySellers: string | null
}

export interface Earnings {
  commission: string
  spread: string
  total: string
}

// GET /dashboard/overview (Backend spec 015): a section is null when the viewer may not see it.
export interface OverviewData {
  earnings: Earnings | null
  transactions: TransactionRow[] | null
  needsDecision: NeedsDecisionRow[] | null
  thisMonth: ThisMonth | null
}

// GET /dashboard/nav-counts: a count is null when the viewer lacks its permission.
export interface NavCounts {
  customersPending: number | null
  customersByStatus: CustomerCounts | null
  topupsOpen: number | null
  listingsInReview: number | null
  withdrawalsWaiting: number | null
  disputesUnresolved: number | null
  listingReportsOpen: number | null
}
