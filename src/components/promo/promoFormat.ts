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

// ---- The View panel: every term of a code in plain words (owner note 2026-10-25) ----

function egp (amount: number): string {
  return `${formatMoney(String(amount))} EGP`
}

/** Who types the code, and where. */
export function sideWords (c: PromoCodeRow): string {
  if (c.kind === 'market_maker') {
    return 'A dealer (market maker), when sending a buy request'
  }
  if (c.kind === 'buyer' || c.side === 'buyer') {
    return 'The buyer, when sending a buy request'
  }
  return 'The seller, on the sell form or on their listing'
}

/** What the code changes, one line each: the commission, the spread, the deposit, the advance. */
export function effectLines (c: PromoCodeRow): string[] {
  const lines: string[] = []
  const { mode, percent } = c.what_it_does.commission
  switch (mode) {
    case 'waive': {
      lines.push('The seller pays no commission, and so no VAT either.')

      break
    }
    case 'percent': {
      lines.push(`${trimPercent(percent)}% off the seller's commission (VAT included), never below the minimum commission.`)

      break
    }
    case 'amount': {
      lines.push(`${formatMoney(c.what_it_does.commission.amount_egp ?? '0')} EGP off the seller's commission (VAT included), never below the minimum commission.`)

      break
    }
  // No default
  }
  if (c.what_it_does.gives_spread) {
    lines.push(c.kind === 'market_maker'
      ? 'The dealer pays the price the seller gets: the spread goes to the dealer, not to Dahab.'
      : 'The buyer pays the price the seller gets: the spread comes off the buyer\'s total as a discount.')
  }
  const deposit = depositWords(c)
  if (deposit !== null) {
    lines.push(`${deposit}; the price itself is unchanged.`)
  }
  if (c.what_it_does.pays_advance) {
    lines.push('The seller\'s first gold sale is paid in advance.')
  }
  if (lines.length === 0) {
    lines.push('Nothing changes in the price; the use is recorded.')
  }
  return lines
}

/** One worked example with round figures, so the effect is clear at a glance. */
export function exampleLine (c: PromoCodeRow): string {
  const { mode, percent } = c.what_it_does.commission
  const commission = 300
  if (mode === 'waive') {
    return `A sale with a ${egp(commission)} commission: the seller pays 0 and receives ${egp(commission)} more.`
  }
  if (mode === 'percent') {
    const pays = commission * (100 - Number(percent ?? 0)) / 100
    return `A sale with a ${egp(commission)} commission: the seller pays ${egp(pays)} (or the minimum, if higher).`
  }
  if (mode === 'amount') {
    const pays = Math.max(0, commission - Number(c.what_it_does.commission.amount_egp ?? 0))
    return `A sale with a ${egp(commission)} commission: the seller pays ${egp(pays)} (or the minimum, if higher).`
  }
  if (c.what_it_does.gives_spread) {
    return `A gold piece at ${egp(31_500)} for buyers and ${egp(31_000)} for sellers: the buyer pays ${egp(31_000)}.`
  }
  const d = c.what_it_does.deposit
  if (d && d.mode === 'percent') {
    return `A deposit of ${egp(10_000)} becomes ${egp(10_000 * (100 - Number(d.percent ?? 0)) / 100)}.`
  }
  if (d && d.mode === 'amount') {
    return `A deposit of ${egp(10_000)} becomes ${egp(Math.max(1, 10_000 - Number(d.amount_egp ?? 0)))}.`
  }
  return '—'
}

/** How often, when and how much: the use limit, the dates, a dealer's conditions and the monthly cap. */
export function limitLines (c: PromoCodeRow): string[] {
  const { conditions } = c
  const lines: string[] = [
    conditions.use_limit === 'once'
      ? 'Once per person (per national ID)'
      : (conditions.use_limit === 'monthly' ? 'Once a month per person' : 'No limit per person'),
  ]
  if (conditions.starts_on) {
    lines.push(`From ${formatDate(conditions.starts_on, true)}`)
  }
  if (conditions.ends_on) {
    lines.push(`Until ${formatDate(conditions.ends_on, true)}`)
  }
  if (conditions.min_listed_days !== null) {
    lines.push(`Only on pieces listed at least ${conditions.min_listed_days} days`)
  }
  if (conditions.requires_approval) {
    lines.push('Only on pieces an admin approved for dealers')
  }
  if (c.monthly_cap_egp !== null) {
    lines.push(`At most ${formatMoney(c.monthly_cap_egp)} EGP a month in total`)
  }
  return lines
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
