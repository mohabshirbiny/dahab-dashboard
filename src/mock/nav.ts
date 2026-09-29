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
      { key: 'transfers', title: 'Incoming transfers', to: '/dashboard/transfers', liveBadge: 'topupsToMatch', permission: 'topup.match' },
      { key: 'statement', title: 'Wallet statement', to: '/dashboard/statement', permission: 'wallet.view' },
      { key: 'compensation', title: 'Compensation', to: '/dashboard/compensation', hidden: true },
      { key: 'bankbook', title: 'Bank movements', to: '/dashboard/bankbook', hidden: true },
      { key: 'closing', title: 'Daily closing', to: '/dashboard/closing', hidden: true },
      { key: 'invoices', title: 'Invoices', to: '/dashboard/invoices', hidden: true },
    ],
  },
  {
    label: 'Controls',
    items: [
      { key: 'pricing', title: 'Gold pricing', to: '/dashboard/pricing', permission: 'pricing.view' },
      { key: 'rates', title: 'Commission rates', to: '/dashboard/rates', permission: 'pricing.view' },
      // Not in the design: Backend spec 009 asked for a settings-like place for Dahab's receiving accounts.
      { key: 'receiving-accounts', title: 'Receiving accounts', to: '/dashboard/receiving-accounts', anyPermission: ['topup.match', 'topup.accounts.manage'] },
      { key: 'promos', title: 'Promo codes', to: '/dashboard/promos', hidden: true },
      { key: 'mm', title: 'Market maker approvals', to: '/dashboard/market-maker', badge: 2, hidden: true },
      { key: 'karats', title: 'Karats', to: '/dashboard/karats', permission: 'reference.view' },
      { key: 'switches', title: 'Switches', to: '/dashboard/switches', hidden: true },
      { key: 'branches', title: 'Branches and hours', to: '/dashboard/branches', permission: 'reference.view' },
      { key: 'content', title: 'App text', to: '/dashboard/content', hidden: true },
      { key: 'docs', title: 'Terms and versions', to: '/dashboard/docs', hidden: true },
    ],
  },
  {
    label: 'People',
    items: [
      { key: 'customer', title: 'Customer file', to: '/dashboard/customer', permission: 'customer.view' },
      {
        key: 'users',
        title: 'Users and verification',
        to: '/dashboard/users',
        liveBadge: 'customersPending',
        permission: 'customer.view',
      },
      { key: 'staff', title: 'Staff and permissions', to: '/dashboard/staff', permission: 'staff.view' },
      { key: 'audit', title: 'Audit log', to: '/dashboard/audit', anyPermission: ['audit.view_all', 'audit.view_own'] },
    ],
  },
]
