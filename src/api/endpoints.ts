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
  identityDocumentImage: (id: string) => `/dashboard/identity-documents/${encodeURIComponent(id)}/image`,
  identityDocumentReview: (id: string) => `/dashboard/identity-documents/${encodeURIComponent(id)}/review`,
} as const
