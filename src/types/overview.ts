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

export interface CustomerWallets {
  available: number
  heldOnOpenOrders: number
  totalOwed: number
}

export interface GoldPriceSnapshot {
  sellersGet21k: number
  buyersPay21k: number
  differencePerGram: number
  feedStatus: { label: string; variant: StatusVariant }
  lastUpdated: string
}

export interface ThisMonth {
  newSellers: number
  piecesListed: number
  sold: number
  sellThroughPct: number
  moneyReachesSellersIn: string
}

export interface OverviewData {
  hero: OverviewHeroStat
  stats: OverviewStat[]
  transactions: TransactionRow[]
  needsDecision: NeedsDecisionRow[]
  wallets: CustomerWallets
  goldPrice: GoldPriceSnapshot
  thisMonth: ThisMonth
}
