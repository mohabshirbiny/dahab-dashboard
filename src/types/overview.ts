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
  value: number
  heldNow: number | null
  action: {
    label: string
    kind: 'link' | 'export'
    target: string
  }
}

export interface NeedsDecisionRow {
  id: string
  what: string
  whoSub: string
  waitingLabel: string
  waitingVariant: StatusVariant
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
  sellersGet21k: number
  buyersPay21k: number
  differencePerGram: number
  feedStatus: { label: string, variant: StatusVariant }
  lastUpdated: string
}

export interface ThisMonth {
  newSellers: number
  piecesListed: number
  sold: number
  sellThroughPct: number
  moneyReachesSellersIn: string
}

// The mock parts of the Overview. The safety figure (hero), "Held on open
// orders" and the Customer wallets panel come from the Backend (spec 008).
export interface OverviewData {
  stats: OverviewStat[]
  transactions: TransactionRow[]
  needsDecision: NeedsDecisionRow[]
  goldPrice: GoldPriceSnapshot
  thisMonth: ThisMonth
}
