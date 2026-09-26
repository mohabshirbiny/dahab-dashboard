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
      { key: 'listings', title: 'Listings to review', to: '/dashboard/listings', badge: 14, hidden: true },
      { key: 'orders', title: 'Orders', to: '/dashboard/orders', badge: 6, hidden: true },
      { key: 'inspections', title: 'Inspections', to: '/dashboard/inspections', badge: 3, hidden: true },
      { key: 'disputes', title: 'Disputes and reports', to: '/dashboard/disputes', badge: 2, hidden: true },
    ],
  },
  {
    label: 'Money',
    items: [
      { key: 'withdrawals', title: 'Withdrawals', to: '/dashboard/withdrawals', badge: 5, hidden: true },
      { key: 'transfers', title: 'Incoming transfers', to: '/dashboard/transfers', badge: 8, hidden: true },
      { key: 'statement', title: 'Wallet statement', to: '/dashboard/statement', hidden: true },
      { key: 'compensation', title: 'Compensation', to: '/dashboard/compensation', hidden: true },
      { key: 'bankbook', title: 'Bank movements', to: '/dashboard/bankbook', hidden: true },
      { key: 'closing', title: 'Daily closing', to: '/dashboard/closing', hidden: true },
      { key: 'invoices', title: 'Invoices', to: '/dashboard/invoices', hidden: true },
    ],
  },
  {
    label: 'Controls',
    items: [
      { key: 'pricing', title: 'Gold pricing', to: '/dashboard/pricing', hidden: true },
      { key: 'rates', title: 'Commission rates', to: '/dashboard/rates', hidden: true },
      { key: 'promos', title: 'Promo codes', to: '/dashboard/promos', hidden: true },
      { key: 'mm', title: 'Market maker approvals', to: '/dashboard/market-maker', badge: 2, hidden: true },
      { key: 'karats', title: 'Karats', to: '/dashboard/karats', hidden: true },
      { key: 'switches', title: 'Switches', to: '/dashboard/switches', hidden: true },
      { key: 'branches', title: 'Branches and hours', to: '/dashboard/branches', hidden: true },
      { key: 'content', title: 'App text', to: '/dashboard/content', hidden: true },
      { key: 'docs', title: 'Terms and versions', to: '/dashboard/docs', hidden: true },
    ],
  },
  {
    label: 'People',
    items: [
      { key: 'customer', title: 'Customer file', to: '/dashboard/customer', hidden: true },
      {
        key: 'users',
        title: 'Users and verification',
        to: '/dashboard/users',
        liveBadge: 'customersPending',
        permission: 'customer.view',
      },
      { key: 'staff', title: 'Staff and permissions', to: '/dashboard/staff', permission: 'staff.view' },
      { key: 'audit', title: 'Audit log', to: '/dashboard/audit', hidden: true },
    ],
  },
]
