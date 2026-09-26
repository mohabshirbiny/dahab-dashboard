import type { Permission } from './staff'

// Badges that come from a live query instead of a fixed number.
export type LiveBadge = 'customersPending'

export interface NavItem {
  key: string
  title: string
  to: string
  badge?: number
  liveBadge?: LiveBadge
  // Not built yet: kept for page titles, left out of the sidebar. Remove when the page ships.
  hidden?: boolean
  // Hidden from staff who do not have this permission.
  permission?: Permission
}

export interface NavGroup {
  label: string
  items: NavItem[]
}
