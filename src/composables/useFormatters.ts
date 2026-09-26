export function formatNumber (value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  return value.toLocaleString('en-US')
}

export function formatCurrency (value: number | null | undefined, suffix = 'EGP'): string {
  if (value === null || value === undefined) {
    return '—'
  }
  return `${value.toLocaleString('en-US')} ${suffix}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

// Date-only values ("2031-03-14") are calendar dates, so they are read in local time.
function toTime (value: string): number {
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
}

// "28 Aug 2026". The year is dropped for the current year when `short` is set.
export function formatDate (value: string | null | undefined, short = false): string {
  if (!value) {
    return '—'
  }
  const d = new Date(toTime(value))
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return short && d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`
}

// "28 Aug 2026, 14:22"
export function formatDateTime (value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const d = new Date(toTime(value))
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return `${formatDate(value)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "9 hours ago", "Yesterday", then a date once it is older than a week.
export function formatRelativeTime (value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const diff = Date.now() - toTime(value)
  if (Number.isNaN(diff)) {
    return '—'
  }
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) {
    return 'Yesterday'
  }
  if (days < 7) {
    return `${days} days ago`
  }
  return formatDate(value, true)
}

export function isPast (value: string | null | undefined): boolean {
  if (!value) {
    return false
  }
  const time = toTime(value)
  return !Number.isNaN(time) && time < Date.now()
}
