export interface NavItem {
  key: string
  title: string
  to: string
  badge?: number
}

export interface NavGroup {
  label: string
  items: NavItem[]
}
