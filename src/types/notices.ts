import type { ApiNoticeSeverity } from './api'

// Dashboard notices, the bell (Backend spec 021). Staff-facing English written by the Backend.
export type NoticeSeverity = ApiNoticeSeverity

export interface StaffNotice {
  id: string
  kind: string
  severity: NoticeSeverity
  title: string
  body: string
  // A Dashboard path, for example `/dashboard/security` or `/dashboard/audit?entry=12`.
  link: string | null
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
