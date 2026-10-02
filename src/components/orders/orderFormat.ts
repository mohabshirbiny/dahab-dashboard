// Display helpers for Orders (Backend spec 012).

// An ISO time as a <input type="datetime-local"> value, in the browser's time.
export function toLocalInput (iso: string | null | undefined): string {
  if (!iso) {
    return ''
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// A datetime-local value back to ISO with its offset, so the Backend reads the same moment.
export function fromLocalInput (value: string): string | null {
  if (value.trim() === '') {
    return null
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// "-5.0000" → "−5.00%": a weight difference as the Backend sends it (4 places), shown with 2.
export function formatPct (value: string | null | undefined): string {
  const n = Number(value)
  if (value === null || value === undefined || !Number.isFinite(n)) {
    return '—'
  }
  return `${n.toFixed(2)}%`
}
