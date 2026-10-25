import type { PromoCodeRow } from '@/composables/useMarketMakers'
import { formatDate, formatMoney } from '@/composables/useFormatters'
import { backendCodeOf } from '@/services/errors'

// The words of the Promo codes table, as in the design's rows (Backend spec 023 Story 5).

function trimPercent (value: string | null): string {
  return value === null ? '' : String(Number(value))
}

/** "No commission" · "50% off commission" · "Commission as it is". */
export function commissionWords (c: PromoCodeRow): string {
  const { mode, percent } = c.what_it_does.commission
  if (mode === 'waive') {
    return 'No commission'
  }
  if (mode === 'percent') {
    return `${trimPercent(percent)}% off commission`
  }
  if (mode === 'amount') {
    return `${trimPercent(c.what_it_does.commission.amount_egp ?? null)} EGP off commission`
  }
  return 'Commission as it is'
}

const PRODUCT_WORDS = { gold: 'Gold', diamond: 'Diamond', gold_with_diamond: 'Gold with diamond' } as const

/** "Gold" · "Diamond" · "Gold with diamond" · "Any product". */
export function productWords (c: PromoCodeRow): string {
  return c.product_type ? PRODUCT_WORDS[c.product_type] : 'Any product'
}

/** What a buyer code does on stones: "50% off the deposit" · "500 EGP off the deposit". */
export function depositWords (c: PromoCodeRow): string | null {
  const d = c.what_it_does.deposit
  if (!d || d.mode === 'none') {
    return null
  }
  return d.mode === 'percent' ? `${trimPercent(d.percent)}% off the deposit` : `${trimPercent(d.amount_egp)} EGP off the deposit`
}

/** Small lines under "What it does". */
export function whatItDoesNotes (c: PromoCodeRow): string[] {
  const notes: string[] = []
  if (c.kind === 'buyer' && c.what_it_does.gives_spread) {
    notes.push('Pays the price the seller gets (no spread)')
  } else if (c.what_it_does.gives_spread) {
    notes.push('Spread goes to them')
  }
  const deposit = depositWords(c)
  if (deposit !== null) {
    notes.push(deposit)
  }
  if (c.product_type) {
    notes.push(`For ${productWords(c).toLowerCase()} only`)
  }
  if (c.what_it_does.pays_advance) {
    notes.push('Pays the first gold sale in advance')
  }
  return notes
}

/** The "Conditions" cell: a main line and the small lines under it. */
export function conditionLines (c: PromoCodeRow): { main: string | null, notes: string[] } {
  const { conditions } = c
  const lines: string[] = []
  const notes: string[] = []

  if (conditions.min_listed_days !== null) {
    lines.push(`${conditions.min_listed_days} days old`)
    if (conditions.requires_approval) {
      notes.push('Admin approved')
    }
  }
  if (conditions.use_limit === 'once') {
    lines.push('Once per ID')
  }
  if (conditions.use_limit === 'monthly') {
    lines.push('Once a month')
  }
  if (conditions.starts_on) {
    notes.push(`Starts ${formatDate(conditions.starts_on, true)}`)
  }
  if (conditions.ends_on) {
    lines.push(`Ends ${formatDate(conditions.ends_on, true)}`)
  }

  return { main: lines.length > 0 ? lines.join(' · ') : null, notes }
}

/** "312,400 of 500,000" for a capped code, "64 uses" otherwise, "—" for an off code nobody used. */
export function usedThisMonth (c: PromoCodeRow): string {
  if (c.monthly_cap_egp !== null) {
    return `${formatMoney(c.value_this_month_egp)} of ${formatMoney(c.monthly_cap_egp)}`
  }
  if (c.uses_this_month === 0 && !c.is_active) {
    return '—'
  }
  return `${c.uses_this_month} ${c.uses_this_month === 1 ? 'use' : 'uses'}`
}

/** The bar under a capped code: how much of the monthly cap has been used, 0–100. */
export function capPercent (c: PromoCodeRow): number | null {
  if (c.monthly_cap_egp === null) {
    return null
  }
  const cap = Number(c.monthly_cap_egp)
  if (!(cap > 0)) {
    return null
  }
  return Math.min(100, Math.round((Number(c.value_this_month_egp) / cap) * 100))
}

/** One sentence per refusal of "Create the code" (Backend contracts/codes-and-events.md). */
export function promoCreateError (error: unknown, fallback: string): string {
  switch (backendCodeOf(error)) {
    case 'promo_code_exists': {
      return 'There is already a code with this name, or this account already has a dealer code.'
    }
    case 'promo_account_not_found': {
      return 'No account matches that number or phone.'
    }
    case 'promo_customer_not_market_maker': {
      return 'The account a dealer code is tied to must be a market maker.'
    }
    default: {
      return fallback
    }
  }
}
