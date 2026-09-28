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
} as const
