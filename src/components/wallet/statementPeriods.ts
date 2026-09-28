import { cairoDate } from '@/types/audit'

export type StatementPeriodPreset = 'this-month' | 'last-month' | '90' | 'custom'

export const PERIOD_OPTIONS: Array<{ value: StatementPeriodPreset, label: string }> = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom dates' },
]

const pad = (n: number) => String(n).padStart(2, '0')

// Cairo calendar days (the Backend counts periods in Cairo time).
export function presetRange (preset: Exclude<StatementPeriodPreset, 'custom'>): { from: string, to: string } {
  const today = cairoDate()
  const [year, month] = today.split('-').map(Number) as [number, number]

  if (preset === '90') {
    return { from: cairoDate(89), to: today }
  }
  if (preset === 'this-month') {
    return { from: `${year}-${pad(month)}-01`, to: today }
  }
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate()
  return { from: `${prevYear}-${pad(prevMonth)}-01`, to: `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}` }
}
