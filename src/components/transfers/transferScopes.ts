import type { TopUpStatus } from '@/types/topup'

// The status groups of the Incoming transfers page. "To match" is the Backend's
// default (pending and on hold).
export type TransferScope = 'open' | 'credited' | 'rejected' | 'cancelled' | 'all'

export const SCOPE_STATUSES: Record<TransferScope, TopUpStatus[]> = {
  open: ['pending', 'on_hold'],
  credited: ['credited'],
  rejected: ['rejected'],
  cancelled: ['cancelled'],
  all: ['pending', 'on_hold', 'credited', 'rejected', 'cancelled'],
}

export const SCOPE_OPTIONS: Array<{ value: TransferScope, label: string }> = [
  { value: 'open', label: 'To match' },
  { value: 'credited', label: 'Credited' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]
