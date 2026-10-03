import type { Withdrawal } from '@/types/withdrawal'
import { formatDate } from '@/composables/useFormatters'

export interface SignalLine {
  text: string
  tone: 'ok' | 'wait' | 'bad'
}

// "Before you release" (Backend spec 013 research R8): only facts the Backend sends.
export function signalLines (w: Withdrawal): SignalLine[] {
  const s = w.signals
  if (!s) {
    return []
  }
  const lines: SignalLine[] = [s.identityVerified ? { text: 'Identity verified', tone: 'ok' } : { text: 'Identity not verified', tone: 'bad' }]
  if (s.suspended) {
    lines.push({ text: 'Account suspended', tone: 'bad' })
  }
  if (s.firstPayoutToAccount) {
    lines.push({ text: 'New account, first payout to it', tone: 'wait' })
  } else {
    lines.push({ text: `Paid out to this account ${s.payoutsToAccount} ${s.payoutsToAccount === 1 ? 'time' : 'times'}`, tone: 'ok' })
  }
  if (s.inUseChangedAt) {
    lines.push({ text: `Account changed ${formatDate(s.inUseChangedAt)}`, tone: 'wait' })
  }
  if (s.completedSales > 0) {
    lines.push({ text: `Money came from ${s.completedSales} completed ${s.completedSales === 1 ? 'sale' : 'sales'}`, tone: 'ok' })
  }
  if (s.toppedUpNeverTraded) {
    lines.push({ text: 'Topped up, never traded since', tone: 'bad' })
  }
  return lines
}
