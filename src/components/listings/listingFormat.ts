// Display helpers for Listings to review (Backend spec 010).

// "30.000" → "30.00", "8.125" → "8.125": grams as the design writes them.
export function formatWeight (value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const grams = Number(value)
  if (!Number.isFinite(grams)) {
    return value
  }
  return grams.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

// The design's "As % of gold value": the making charge per gram against what buyers
// pay per gram of that karat now. For display only — a hint to the reviewer, never a
// figure that is stored or sent anywhere.
export function makingShareOfGold (makingPerGram: string | null, goldRatePerGram: string | null): number | null {
  const making = Number(makingPerGram)
  const rate = Number(goldRatePerGram)
  if (!makingPerGram || !goldRatePerGram || !Number.isFinite(making) || !Number.isFinite(rate) || rate <= 0) {
    return null
  }
  return Math.round((making / rate) * 100)
}
