// Reference data: karats, branches with weekly hours, and closures (Backend spec 004).
// Wire shapes are in `src/types/api.ts`; `reference.service.ts` maps them to these.

export interface Karat {
  code: number
  // Decimal string with five places, e.g. "0.87500".
  purity: string
  isEnabled: boolean
  sortOrder: number
}

// One open interval. dow: 0 = Sunday … 6 = Saturday. Times are "HH:MM", branch timezone.
export interface BranchHour {
  dow: number
  opensAt: string
  closesAt: string
}

export interface Branch {
  id: number
  nameEn: string
  nameAr: string
  addressEn: string
  addressAr: string
  // Shown to customers with the address and hours; null when not set.
  phone: string | null
  mapUrl: string | null
  timezone: string
  isEnabled: boolean
  hours: BranchHour[]
}

// A full day a branch, or every branch (branchId null), is closed.
export interface BranchClosure {
  id: number
  branchId: number | null
  closureDate: string
  reasonEn: string | null
  reasonAr: string | null
}

export interface CreateKaratInput {
  code: number
  purity: string
}

export interface BranchInput {
  nameEn: string
  nameAr: string
  addressEn: string
  addressAr: string
  phone: string | null
  mapUrl: string | null
  timezone: string
  isEnabled: boolean
  // Always the whole week: the Backend replaces it.
  hours: BranchHour[]
}

export interface CreateClosureInput {
  branchId: number | null
  closureDate: string
  reasonEn: string | null
  reasonAr: string | null
}

export const DEFAULT_TIMEZONE = 'Africa/Cairo'

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// "0.87500" → "875", the way the design shows purity (parts per thousand).
export function purityPerMille (purity: string): string {
  const value = Math.round(Number(purity) * 100_000) / 100
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '')
}

function intervalsOf (hours: readonly BranchHour[], dow: number): string {
  return hours
    .filter(h => h.dow === dow)
    .map(h => `${h.opensAt} to ${h.closesAt}`)
    .join(', ')
}

// "Sun to Thu, 10:00 to 18:00" — consecutive days with the same hours are grouped,
// across the week's end too ("Sat to Thu").
export function openSummary (hours: readonly BranchHour[]): string[] {
  const days = [0, 1, 2, 3, 4, 5, 6].map(dow => intervalsOf(hours, dow))
  // Start after a change (a closed day, or different hours), so no run is split at Saturday.
  const first = days.findIndex((same, dow) => same !== days[(dow + 6) % 7])
  const start = first === -1 ? 0 : first
  const lines: string[] = []
  let i = 0
  while (i < 7) {
    const dow = (start + i) % 7
    const same = days[dow]!
    let length = 1
    while (i + length < 7 && days[(dow + length) % 7] === same) {
      length++
    }
    if (same !== '') {
      const end = (dow + length - 1) % 7
      const label = length === 1 ? DAY_SHORT[dow] : `${DAY_SHORT[dow]} to ${DAY_SHORT[end]}`
      lines.push(length === 7 ? `Every day, ${same}` : `${label}, ${same}`)
    }
    i += length
  }
  return lines
}

// Days with no open interval, e.g. "Fri, Sat".
export function closedDays (hours: readonly BranchHour[]): string {
  const closed = DAY_SHORT.filter((_, dow) => !hours.some(h => h.dow === dow))
  return closed.length > 0 ? closed.join(', ') : 'None'
}

// Rules the Backend enforces; mirrored here only to help while typing.
export const KARAT_CODE_MIN = 1
export const KARAT_CODE_MAX = 24
export const PURITY_PATTERN = /^(0(\.\d{1,5})?|1(\.0{1,5})?)$/
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
