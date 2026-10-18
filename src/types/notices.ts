import type { ApiNoticeSeverity } from './api'

// Dashboard notices, the bell (Backend spec 021): founder security alerts and, since spec 026, work
// notices for the queues the staff member works. Staff-facing English written by the Backend.
export type NoticeSeverity = ApiNoticeSeverity

export interface StaffNotice {
  id: string
  // `founder_alert` or a `work_*` kind; the bell renders title/body/link, never a per-kind map.
  kind: string
  severity: NoticeSeverity
  title: string
  body: string
  // A Dashboard path, for example `/dashboard/security` or `/dashboard/orders?id=…`.
  link: string | null
  // Events grouped in this notice (the title already says how many).
  count: number
  createdAt: string
  readAt: string | null
}

export interface StaffNoticePage {
  rows: StaffNotice[]
  page: number
  pageSize: number
  total: number
  unreadCount: number
}
