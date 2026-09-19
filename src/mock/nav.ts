import type { NavGroup } from '@/types/nav'

export const navGroups: NavGroup[] = [
  {
    label: 'Today',
    items: [
      { key: 'overview', title: 'Overview', to: '/dashboard/overview' },
    ],
  },
  {
    label: 'Daily work',
    items: [
      { key: 'listings', title: 'Listings to review', to: '/dashboard/listings', badge: 14 },
      { key: 'orders', title: 'Orders', to: '/dashboard/orders', badge: 6 },
      { key: 'inspections', title: 'Inspections', to: '/dashboard/inspections', badge: 3 },
      { key: 'disputes', title: 'Disputes and reports', to: '/dashboard/disputes', badge: 2 },
    ],
  },
  {
    label: 'Money',
    items: [
      { key: 'withdrawals', title: 'Withdrawals', to: '/dashboard/withdrawals', badge: 5 },
      { key: 'transfers', title: 'Incoming transfers', to: '/dashboard/transfers', badge: 8 },
      { key: 'statement', title: 'Wallet statement', to: '/dashboard/statement' },
      { key: 'compensation', title: 'Compensation', to: '/dashboard/compensation' },
      { key: 'bankbook', title: 'Bank movements', to: '/dashboard/bankbook' },
      { key: 'closing', title: 'Daily closing', to: '/dashboard/closing' },
      { key: 'invoices', title: 'Invoices', to: '/dashboard/invoices' },
    ],
  },
  {
    label: 'Controls',
    items: [
      { key: 'pricing', title: 'Gold pricing', to: '/dashboard/pricing' },
      { key: 'rates', title: 'Commission rates', to: '/dashboard/rates' },
      { key: 'promos', title: 'Promo codes', to: '/dashboard/promos' },
      { key: 'mm', title: 'Market maker approvals', to: '/dashboard/market-maker', badge: 2 },
      { key: 'karats', title: 'Karats', to: '/dashboard/karats' },
      { key: 'switches', title: 'Switches', to: '/dashboard/switches' },
      { key: 'branches', title: 'Branches and hours', to: '/dashboard/branches' },
      { key: 'content', title: 'App text', to: '/dashboard/content' },
      { key: 'docs', title: 'Terms and versions', to: '/dashboard/docs' },
    ],
  },
  {
    label: 'People',
    items: [
      { key: 'customer', title: 'Customer file', to: '/dashboard/customer' },
      { key: 'users', title: 'Users and verification', to: '/dashboard/users', badge: 9 },
      { key: 'staff', title: 'Staff and permissions', to: '/dashboard/staff' },
      { key: 'audit', title: 'Audit log', to: '/dashboard/audit' },
    ],
  },
]
