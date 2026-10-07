// Real Backend routes, relative to `VITE_API_BASE_URL` (which ends in `/api/v1`).
// Source: dahab-backend/routes/api.php. Only routes that exist are listed;
// screens without a Backend route yet have no entry here.
export const endpoints = {
  staffLogin: '/dashboard/auth/login',
  staffMfaVerify: '/dashboard/auth/mfa/verify',
  staffMfaEnroll: '/dashboard/auth/mfa/enroll',
  staffRefresh: '/dashboard/auth/refresh',
  staffLogout: '/dashboard/auth/logout',
  staffMe: '/dashboard/auth/me',
  customers: '/dashboard/customers',
  customer: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}`,
  // Customer file (Backend spec 007).
  customerSuspend: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}/suspend`,
  customerReinstate: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}/reinstate`,
  customerActivity: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}/activity`,
  customerSessions: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}/sessions`,
  // Backend spec 017: what the customer was sent (their inbox), read-only.
  customerNotifications: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}/notifications`,
  identityDocumentImage: (id: string) => `/dashboard/identity-documents/${encodeURIComponent(id)}/image`,
  identityDocumentReview: (id: string) => `/dashboard/identity-documents/${encodeURIComponent(id)}/review`,
  // Access control (Backend spec 002).
  permissions: '/dashboard/permissions',
  roles: '/dashboard/roles',
  role: (name: string) => `/dashboard/roles/${encodeURIComponent(name)}`,
  staff: '/dashboard/staff',
  staffMember: (id: string) => `/dashboard/staff/${encodeURIComponent(id)}`,
  staffRoles: (id: string) => `/dashboard/staff/${encodeURIComponent(id)}/roles`,
  // Reference data (Backend spec 004).
  staffBranch: (id: string) => `/dashboard/staff/${encodeURIComponent(id)}/branch`,
  karats: '/dashboard/karats',
  karatToggle: (code: number) => `/dashboard/karats/${code}/toggle`,
  branches: '/dashboard/branches',
  branch: (id: number) => `/dashboard/branches/${id}`,
  branchClosures: '/dashboard/branch-closures',
  branchClosure: (id: number) => `/dashboard/branch-closures/${id}`,
  // Pricing (Backend spec 005).
  settings: '/dashboard/settings',
  setting: (key: string) => `/dashboard/settings/${encodeURIComponent(key)}`,
  settingsHistory: '/dashboard/settings/history',
  goldPrices: '/dashboard/gold-prices',
  goldPricesCurrent: '/dashboard/gold-prices/current',
  goldPricesPreview: '/dashboard/gold-prices/preview',
  manualPrice: '/dashboard/gold-prices/manual',
  manualPriceConfirm: (id: number) => `/dashboard/gold-prices/manual/${id}/confirm`,
  karatAdjustments: (code: number) => `/dashboard/karats/${code}/adjustments`,
  adjustmentHistory: '/dashboard/price-adjustments/history',
  // Audit log (Backend spec 006).
  auditLog: '/dashboard/audit-log',
  auditEntry: (id: number) => `/dashboard/audit-log/${id}`,
  auditCategories: '/dashboard/audit-log/categories',
  auditExport: '/dashboard/audit-log/export',
  // Wallets (Backend spec 008): reads only, permission wallet.view.
  walletOverview: '/dashboard/wallets/overview',
  customerWallet: (id: string) => `/dashboard/customers/${encodeURIComponent(id)}/wallet`,
  walletStatement: '/dashboard/wallet-statement',
  walletStatementExport: '/dashboard/wallet-statement/export',
  // Wallet top-up (Backend spec 009): topup.match / topup.accounts.manage.
  topUps: '/dashboard/topups',
  topUpsExport: '/dashboard/topups/export',
  topUp: (id: string) => `/dashboard/topups/${encodeURIComponent(id)}`,
  topUpReceipt: (id: string) => `/dashboard/topups/${encodeURIComponent(id)}/receipt`,
  topUpAction: (id: string, action: 'match' | 'hold' | 'unhold' | 'reject') => `/dashboard/topups/${encodeURIComponent(id)}/${action}`,
  receivingAccounts: '/dashboard/receiving-accounts',
  receivingAccount: (id: number) => `/dashboard/receiving-accounts/${id}`,
  // Listings to review (Backend spec 010): listing.review / listing.request_changes / listing.takedown.
  listings: '/dashboard/listings',
  listing: (id: string) => `/dashboard/listings/${encodeURIComponent(id)}`,
  listingMedia: (id: string, mediaId: string) => `/dashboard/listings/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}`,
  listingAction: (id: string, action: 'approve' | 'request-changes' | 'reject' | 'takedown') => `/dashboard/listings/${encodeURIComponent(id)}/${action}`,
  // Buy requests (Backend spec 011): cancel an acceptance — order.cancel.
  orderCancel: (orderId: string) => `/dashboard/orders/${encodeURIComponent(orderId)}/cancel`,
  // Orders (Backend spec 012): each action has its own permission (order.view, order.receive,
  // inspection.enter, order.price_adjust, order.change_branch, order.extend_deadline, order.handover).
  orders: '/dashboard/orders',
  order: (id: string) => `/dashboard/orders/${encodeURIComponent(id)}`,
  orderAction: (id: string, action: 'receive' | 'inspection-results' | 'propose-price' | 'change-branch' | 'extend-deadline' | 'handover' | 'seller-return/handover') =>
    `/dashboard/orders/${encodeURIComponent(id)}/${action}`,
  // Spec 014: the ID photo of the person the buyer named to collect (order.handover | order.view).
  orderProxyId: (id: string) => `/dashboard/orders/${encodeURIComponent(id)}/proxy-id`,
  // Spec 014: sellers' requests for more time (order.extend_deadline; reads also order.view).
  extensionRequests: '/dashboard/extension-requests',
  extensionRequestAction: (id: string, action: 'accept' | 'refuse') => `/dashboard/extension-requests/${encodeURIComponent(id)}/${action}`,
  // Disputes (Backend spec 014): dispute.handle; a resolution with money or a suspension needs its own code too.
  // Backend spec 017: listing reports, the other half of Disputes and reports.
  listingReports: '/dashboard/listing-reports',
  listingReport: (id: string) => `/dashboard/listing-reports/${encodeURIComponent(id)}`,
  listingReportAction: (id: string, action: 'dismiss' | 'take-down') => `/dashboard/listing-reports/${encodeURIComponent(id)}/${action}`,
  disputes: '/dashboard/disputes',
  dispute: (id: string) => `/dashboard/disputes/${encodeURIComponent(id)}`,
  disputePhoto: (id: string, photoId: string) => `/dashboard/disputes/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
  disputeAction: (id: string, action: 'pass-on' | 'resolve') => `/dashboard/disputes/${encodeURIComponent(id)}/${action}`,
  disputeAssignees: '/dashboard/dispute-assignees',
  inspections: '/dashboard/inspections',
  workList: '/dashboard/inspections/work-list',
  // Buy requests (Backend spec 012 US10): buy_request.view, read-only.
  buyRequests: '/dashboard/buy-requests',
  // Withdrawals (Backend spec 013): withdrawal.release (reads also wallet.view); payout_account.verify.
  withdrawals: '/dashboard/withdrawals',
  withdrawalsExport: '/dashboard/withdrawals/export',
  withdrawal: (id: string) => `/dashboard/withdrawals/${encodeURIComponent(id)}`,
  withdrawalAction: (id: string, action: 'review' | 'hold' | 'unhold' | 'release' | 'reject') => `/dashboard/withdrawals/${encodeURIComponent(id)}/${action}`,
  payoutAccounts: '/dashboard/payout-accounts',
  payoutAccountAction: (id: string, action: 'verify' | 'refuse') => `/dashboard/payout-accounts/${encodeURIComponent(id)}/${action}`,
  // Finance operations (Backend spec 015): compensation.pay, wallet.adjust, bank.record, day.close (reads also wallet.view).
  compensation: '/dashboard/compensation',
  compensationExport: '/dashboard/compensation/export',
  walletAdjustments: '/dashboard/wallet-adjustments',
  customerWalletAdjust: (customerId: string) => `/dashboard/customers/${encodeURIComponent(customerId)}/wallet-adjustments`,
  staffUploads: '/dashboard/uploads',
  bankMovements: '/dashboard/bank-movements',
  bankMovementsExport: '/dashboard/bank-movements/export',
  bankMovementProof: (id: string) => `/dashboard/bank-movements/${encodeURIComponent(id)}/proof`,
  bankBook: '/dashboard/bank-book',
  bankBookExport: '/dashboard/bank-book/export',
  dailyClose: '/dashboard/daily-close',
  // Tax invoices and credit notes (Backend spec 016): reads invoice.view, credit notes invoice.correct.
  invoices: '/dashboard/invoices',
  invoicesExport: '/dashboard/invoices/export',
  invoice: (id: string) => `/dashboard/invoices/${encodeURIComponent(id)}`,
  invoicePdf: (id: string) => `/dashboard/invoices/${encodeURIComponent(id)}/pdf`,
  invoiceCreditNotes: (id: string) => `/dashboard/invoices/${encodeURIComponent(id)}/credit-notes`,
  creditNotes: '/dashboard/credit-notes',
  creditNotePdf: (id: string) => `/dashboard/credit-notes/${encodeURIComponent(id)}/pdf`,
  dailyCloses: '/dashboard/daily-closes',
  // The Overview's figures (Backend spec 015): any staff; each section by permission.
  overview: '/dashboard/overview',
  // The Orders list as CSV (Backend spec 015): order.view.
  ordersExport: '/dashboard/orders/export',
} as const
