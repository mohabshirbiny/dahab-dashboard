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
      { key: 'listings', title: 'Listings to review', to: '/dashboard/listings', liveBadge: 'listingsToReview', anyPermission: ['listing.review', 'listing.request_changes', 'listing.takedown'] },
      { key: 'orders', title: 'Orders', to: '/dashboard/orders', permission: 'order.view' },
      // Not in the design: Backend spec 012 US10 asked for a read-only view of every buyer in line.
      { key: 'buy-requests', title: 'Buy requests', to: '/dashboard/buy-requests', permission: 'buy_request.view' },
      { key: 'inspections', title: 'Inspections', to: '/dashboard/inspections', anyPermission: ['order.receive', 'inspection.enter', 'order.handover', 'order.view'] },
      { key: 'disputes', title: 'Disputes and reports', to: '/dashboard/disputes', liveBadge: 'disputesOpen', anyPermission: ['dispute.handle', 'listing_report.handle'] },
    ],
  },
  {
    label: 'Money',
    items: [
      // Backend spec 013: the queue (withdrawal.release, read-only with wallet.view) and payout accounts to check.
      { key: 'withdrawals', title: 'Withdrawals', to: '/dashboard/withdrawals', liveBadge: 'withdrawalsWaiting', anyPermission: ['withdrawal.release', 'wallet.view', 'payout_account.verify'] },
      { key: 'transfers', title: 'Incoming transfers', to: '/dashboard/transfers', liveBadge: 'topupsToMatch', permission: 'topup.match' },
      { key: 'statement', title: 'Wallet statement', to: '/dashboard/statement', permission: 'wallet.view' },
      // Backend spec 015: reads with the acting code or wallet.view.
      { key: 'compensation', title: 'Compensation', to: '/dashboard/compensation', anyPermission: ['compensation.pay', 'wallet.view'] },
      { key: 'bankbook', title: 'Bank movements', to: '/dashboard/bankbook', anyPermission: ['bank.record', 'wallet.view'] },
      { key: 'closing', title: 'Daily closing', to: '/dashboard/closing', anyPermission: ['day.close', 'wallet.view'] },
      { key: 'invoices', title: 'Invoices', to: '/dashboard/invoices', anyPermission: ['invoice.view'] },
    ],
  },
  {
    label: 'Controls',
    items: [
      { key: 'pricing', title: 'Gold pricing', to: '/dashboard/pricing', permission: 'pricing.view' },
      { key: 'rates', title: 'Commission rates', to: '/dashboard/rates', permission: 'pricing.view' },
      // Not in the design: Backend spec 009 asked for a settings-like place for Dahab's receiving accounts.
      { key: 'receiving-accounts', title: 'Receiving accounts', to: '/dashboard/receiving-accounts', anyPermission: ['topup.match', 'topup.accounts.manage'] },
      { key: 'promos', title: 'Promo codes', to: '/dashboard/promos', permission: 'promo.manage' },
      { key: 'mm', title: 'Market maker approvals', to: '/dashboard/market-maker', anyPermission: ['market_maker.approve', 'promo.manage'] },
      { key: 'karats', title: 'Karats', to: '/dashboard/karats', permission: 'reference.view' },
      { key: 'switches', title: 'Switches', to: '/dashboard/switches', anyPermission: ['category.stop_new', 'category.pause', 'platform.stop_everything', 'visibility.manage'] },
      { key: 'branches', title: 'Branches and hours', to: '/dashboard/branches', permission: 'reference.view' },
      // Backend spec 019: the customer app's texts (content.edit; not in the design as a separate page route).
      { key: 'content', title: 'App text', to: '/dashboard/content', permission: 'content.edit' },
      // Backend spec 019: every legal text and its versions; a new version needs legal.publish (the CEO).
      { key: 'docs', title: 'Terms and versions', to: '/dashboard/docs', anyPermission: ['legal.publish', 'content.edit'] },
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
