// Backend permission keys. The frontend gates UI on these, never on roles.
export const PERMISSIONS = {
  identityView: 'identity.view',
  identityReview: 'identity.review',
  customerView: 'customer.view',
  // Customer file (Backend spec 007).
  customerSuspend: 'customer.suspend',
  // Access control (Backend spec 002).
  staffView: 'staff.view',
  rolesManage: 'roles.manage',
  // Reference data (Backend spec 004).
  referenceView: 'reference.view',
  karatsToggle: 'karats.toggle',
  karatsCreate: 'karats.create',
  branchesManage: 'branches.manage',
  // Pricing (Backend spec 005).
  pricingView: 'pricing.view',
  pricingRatesManage: 'pricing.rates.manage',
  settingsManage: 'settings.manage',
  goldPriceEnter: 'gold_price.enter',
  goldPriceConfirm: 'gold_price.confirm',
  // Audit log (Backend spec 006).
  auditViewAll: 'audit.view_all',
  auditViewOwn: 'audit.view_own',
  // Wallets (Backend spec 008): CEO and Finance by default, never the COO.
  walletView: 'wallet.view',
  // Wallet top-up (Backend spec 009): CEO and Finance by default, never the COO.
  topupMatch: 'topup.match',
  topupAccountsManage: 'topup.accounts.manage',
  // Listings to review (Backend spec 010): CEO, COO and Operations by default.
  listingReview: 'listing.review',
  listingRequestChanges: 'listing.request_changes',
  listingTakedown: 'listing.takedown',
  // Buy requests (Backend spec 011): cancel an acceptance, refunding the buyer. CEO, COO and Operations by default.
  orderCancel: 'order.cancel',
  // Orders (Backend spec 012). order.view: CEO, COO, Finance, Operations; order.receive: COO,
  // Operations, IGI; inspection.enter and order.handover: IGI; the rest COO and Operations.
  orderView: 'order.view',
  orderReceive: 'order.receive',
  inspectionEnter: 'inspection.enter',
  orderHandover: 'order.handover',
  orderPriceAdjust: 'order.price_adjust',
  orderChangeBranch: 'order.change_branch',
  orderExtendDeadline: 'order.extend_deadline',
  // Buy requests across listings (Backend spec 012 US10), read-only.
  buyRequestView: 'buy_request.view',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Roles are Backend data managed from this Dashboard (spec 002): there is no fixed
// list of role names in the UI. They are labels only; what a person may do comes
// from `permissions`.
export interface RoleRef {
  name: string
  displayName: string
}

export interface StaffUser {
  id: string
  name: string
  email: string
  roles: readonly RoleRef[]
  isFounder: boolean
  // Everything the Backend grants, including keys this UI does not use yet.
  permissions: readonly string[]
}

// The signed-in person's roles as one line, for the sidebar.
export function roleSummary (roles: readonly RoleRef[]): string {
  return roles.map(role => role.displayName).join(', ')
}

export interface StaffLoginPayload {
  email: string
  password: string
}

export interface StaffTokens {
  accessToken: string
  refreshToken: string
}

export interface StaffSession {
  tokens: StaffTokens
  staff: StaffUser
}

// Password accepted, and the account has an authenticator app enrolled.
export interface MfaChallenge {
  // Opaque reference that stands in for the password step.
  sessionRef: string
  // ISO timestamp after which the code can no longer be used.
  expiresAt: string
}

// Password accepted, but the role requires an authenticator app and none is enrolled yet.
export interface MfaEnrollment extends MfaChallenge {
  otpauthUrl: string
  recoveryCodes: string[]
}

export type StaffLoginResult
  = | ({ status: 'authenticated' } & StaffSession)
    | ({ status: 'mfa_required' } & MfaChallenge)
    | ({ status: 'mfa_enrollment_required' } & MfaEnrollment)

export interface VerifyMfaPayload {
  sessionRef: string
  code: string
}

export type EnrollMfaPayload = VerifyMfaPayload
