export function formatNumber (value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('en-US')
}

export function formatCurrency (value: number | null | undefined, suffix = 'EGP'): string {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString('en-US')} ${suffix}`
}
