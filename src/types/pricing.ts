// Pricing: gold prices, per-karat adjustments and settings (Backend spec 005).
// Wire shapes are in `src/types/api.ts`; `pricing.service.ts` maps them to these.
// Money stays a decimal string from the Backend: the UI only formats it, the
// Backend does every calculation (including previews).

export interface StaffRef {
  id: string
  fullName: string
}

export type AdjustmentKind = 'fixed' | 'percent'

export interface Adjustment {
  kind: AdjustmentKind
  value: string
}

export interface KaratPrice {
  code: number
  purity: string
  isEnabled: boolean
  marketBid: string
  marketAsk: string
  sellersGet: string
  buyersPay: string
  difference: string
  adjustments: { buy: Adjustment, sell: Adjustment }
  inverted: boolean
}

export type FeedState = 'healthy' | 'down' | 'not_configured'

export interface GoldPrice {
  id: number
  source: 'feed' | 'manual'
  bid24k: string
  ask24k: string
  effectiveAt: string
  enteredBy: StaffRef | null
  confirmedBy: StaffRef | null
  reason: string | null
}

export type ManualPriceStatus = 'pending' | 'effective' | 'superseded' | 'lapsed'

export interface ManualPrice {
  id: number
  bid24k: string
  ask24k: string
  deviationPct: string | null
  requiresConfirmation: boolean
  status: ManualPriceStatus
  reason: string
  enteredBy: StaffRef
  confirmedBy: StaffRef | null
  confirmedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface CurrentPrices {
  price: GoldPrice | null
  feed: { state: FeedState, lastSuccessAt: string | null, lastFailureAt: string | null }
  pending: ManualPrice | null
  karats: KaratPrice[]
}

export interface PricePreview {
  bid24k: string
  ask24k: string
  deviationPct: string | null
  karats: KaratPrice[]
}

// Either both 24K prices, or a percentage change from the current pair.
export type PriceInput = { bid24k: string, ask24k: string } | { changePct: string }

export interface Setting {
  key: string
  group: 'rates' | 'operations'
  type: 'numeric' | 'bool'
  value: string | boolean
  unit: string
  description: string
  min: string | null
  max: string | null
  integer: boolean
  updatedBy: StaffRef | null
  updatedAt: string
}

export interface SettingChange {
  id: number
  key: string
  oldValue: string | boolean | null
  newValue: string | boolean
  changedBy: StaffRef
  reason: string
  changedAt: string
}

export interface AdjustmentChange {
  id: number
  karatCode: number
  side: 'buy' | 'sell'
  old: Adjustment
  new: Adjustment
  changedBy: StaffRef
  reason: string
  changedAt: string
}

export const REASON_MIN = 5
export const REASON_MAX = 500

// Display only: "6942.9580" → "6,942.96". Never used for arithmetic.
export function formatEgp (value: string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value.length === 0) {
    return '—'
  }
  const n = Number(value)
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : '—'
}

// Display only: a setting or adjustment value without trailing zeros ("20.0000" → "20").
export function trimDecimal (value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value
}

// "−15 EGP" / "+1.5 %"
export function formatAdjustment (a: Adjustment): string {
  const v = trimDecimal(a.value)
  const signed = v.startsWith('-') ? `−${v.slice(1)}` : `+${v}`
  return a.kind === 'percent' ? `${signed} %` : `${signed} EGP`
}

// Mirrors the Backend's input rule (≤ 4 decimals) only to help while typing.
export const DECIMAL_PATTERN = /^-?\d+(\.\d{1,4})?$/
