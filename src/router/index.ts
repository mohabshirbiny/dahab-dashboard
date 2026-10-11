import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import Overview from '@/pages/dashboard/overview.vue'
import Login from '@/pages/login.vue'
import { PERMISSIONS } from '@/types/staff'
import { companyMiddleware } from './guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { public: true, guestOnly: true, title: 'Sign in' },
  },
  {
    // Staff password recovery (Backend spec 020).
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/forgot-password.vue'),
    meta: { public: true, guestOnly: true, title: 'Reset your password' },
  },
  {
    // The emailed link lands here with ?token=. Public, but not guest-only: a member who is
    // signed in on this browser may still follow their own link.
    path: '/set-password',
    name: 'set-password',
    component: () => import('@/pages/set-password.vue'),
    meta: { public: true, title: 'Set your password' },
  },
  {
    path: '/mfa',
    name: 'mfa',
    component: () => import('@/pages/mfa.vue'),
    meta: { public: true, guestOnly: true, title: 'Verification code' },
  },
  {
    path: '/mfa/setup',
    name: 'mfa-enroll',
    component: () => import('@/pages/mfa-enroll.vue'),
    meta: { public: true, guestOnly: true, title: 'Set up verification' },
  },
  {
    // Backend spec 021: a founder's sign-in from a new device waits for the other founder.
    path: '/device-approval',
    name: 'device-approval',
    component: () => import('@/pages/device-approval.vue'),
    meta: { public: true, guestOnly: true, title: 'Waiting for approval' },
  },
  {
    // Backend spec 021: a frozen founder's sign-in, with the first unfreeze confirmation.
    path: '/frozen',
    name: 'frozen',
    component: () => import('@/pages/frozen.vue'),
    meta: { public: true, guestOnly: true, title: 'Account frozen' },
  },
  {
    // One layout for every signed-in screen, so the sidebar survives navigation.
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'overview' } },
      { path: 'dashboard', redirect: { name: 'overview' } },
      { path: 'dashboard/overview', name: 'overview', component: Overview, meta: { title: 'Overview' } },
      {
        path: 'dashboard/users',
        name: 'users',
        component: () => import('@/pages/users/index.vue'),
        meta: { title: 'Users and verification', permissions: [PERMISSIONS.customerView] },
      },
      {
        // Customer file (Backend spec 007): find a customer, then open their file.
        path: 'dashboard/customer',
        name: 'customer',
        component: () => import('@/pages/customer/index.vue'),
        meta: { title: 'Customer file', permissions: [PERMISSIONS.customerView] },
      },
      {
        path: 'dashboard/customers/:id',
        name: 'customer-file',
        component: () => import('@/pages/customers/[id].vue'),
        meta: { title: 'Customer file', permissions: [PERMISSIONS.customerView] },
      },
      {
        // Staff and roles (Backend spec 002). The Roles tab needs roles.manage too.
        path: 'dashboard/staff',
        name: 'staff',
        component: () => import('@/pages/staff/index.vue'),
        meta: { title: 'Staff and permissions', permissions: [PERMISSIONS.staffView] },
      },
      {
        // Audit log (Backend spec 006): everything, or your own actions only.
        path: 'dashboard/audit',
        name: 'audit',
        component: () => import('@/pages/audit/index.vue'),
        meta: { title: 'Audit log', anyPermissions: [PERMISSIONS.auditViewAll, PERMISSIONS.auditViewOwn] },
      },
      {
        // Wallet statement (Backend spec 008): one customer, all customers, or the Dahab wallet.
        path: 'dashboard/statement',
        name: 'statement',
        component: () => import('@/pages/statement/index.vue'),
        meta: { title: 'Wallet statement', permissions: [PERMISSIONS.walletView] },
      },
      {
        // Withdrawals (Backend spec 013): the queue and payout accounts to check.
        path: 'dashboard/withdrawals',
        name: 'withdrawals',
        component: () => import('@/pages/withdrawals/index.vue'),
        meta: { title: 'Withdrawals', anyPermissions: [PERMISSIONS.withdrawalRelease, PERMISSIONS.walletView, PERMISSIONS.payoutAccountVerify] },
      },
      {
        // Finance operations (Backend spec 015): reads with the acting code or wallet.view.
        path: 'dashboard/compensation',
        name: 'compensation',
        component: () => import('@/pages/compensation/index.vue'),
        meta: { title: 'Compensation', anyPermissions: [PERMISSIONS.compensationPay, PERMISSIONS.walletView] },
      },
      {
        path: 'dashboard/bankbook',
        name: 'bankbook',
        component: () => import('@/pages/bankbook/index.vue'),
        meta: { title: 'Bank movements', anyPermissions: [PERMISSIONS.bankRecord, PERMISSIONS.walletView] },
      },
      {
        path: 'dashboard/closing',
        name: 'closing',
        component: () => import('@/pages/closing/index.vue'),
        meta: { title: 'Daily closing', anyPermissions: [PERMISSIONS.dayClose, PERMISSIONS.walletView] },
      },
      {
        // Tax invoices and credit notes (Backend spec 016): invoice.view reads; invoice.correct issues credit notes.
        path: 'dashboard/invoices',
        name: 'invoices',
        component: () => import('@/pages/invoices/index.vue'),
        meta: { title: 'Invoices', permissions: [PERMISSIONS.invoiceView] },
      },
      {
        // Incoming transfers (Backend spec 009): match, hold, reject, credit by hand.
        path: 'dashboard/transfers',
        name: 'transfers',
        component: () => import('@/pages/transfers/index.vue'),
        meta: { title: 'Incoming transfers', permissions: [PERMISSIONS.topupMatch] },
      },
      {
        // Disputes (Backend spec 014): the queue, pass on and resolve; refund and compensation need their own codes.
        path: 'dashboard/disputes',
        name: 'disputes',
        component: () => import('@/pages/disputes/index.vue'),
        // Spec 017: listing reports share the page (listing_report.handle).
        meta: { title: 'Disputes and reports', anyPermissions: [PERMISSIONS.disputeHandle, PERMISSIONS.listingReportHandle] },
      },
      {
        // Orders (Backend spec 012): order.view; each action needs its own permission too.
        path: 'dashboard/orders',
        name: 'orders',
        component: () => import('@/pages/orders/index.vue'),
        meta: { title: 'Orders', permissions: [PERMISSIONS.orderView] },
      },
      {
        // Inspections (Backend spec 012): the branch work list and the results.
        path: 'dashboard/inspections',
        name: 'inspections',
        component: () => import('@/pages/inspections/index.vue'),
        meta: { title: 'Inspections', anyPermissions: [PERMISSIONS.orderReceive, PERMISSIONS.inspectionEnter, PERMISSIONS.orderHandover, PERMISSIONS.orderView] },
      },
      {
        // Buy requests across listings (Backend spec 012 US10), read-only.
        path: 'dashboard/buy-requests',
        name: 'buy-requests',
        component: () => import('@/pages/buy-requests/index.vue'),
        meta: { title: 'Buy requests', permissions: [PERMISSIONS.buyRequestView] },
      },
      {
        // Listings to review (Backend spec 010): any listing permission opens it; each decision needs its own.
        path: 'dashboard/listings',
        name: 'listings',
        component: () => import('@/pages/listings/index.vue'),
        meta: { title: 'Listings to review', anyPermissions: [PERMISSIONS.listingReview, PERMISSIONS.listingRequestChanges, PERMISSIONS.listingTakedown] },
      },
      {
        // Dahab's receiving accounts (Backend spec 009). Changes need topup.accounts.manage.
        path: 'dashboard/receiving-accounts',
        name: 'receiving-accounts',
        component: () => import('@/pages/receiving-accounts/index.vue'),
        meta: { title: 'Receiving accounts', anyPermissions: [PERMISSIONS.topupMatch, PERMISSIONS.topupAccountsManage] },
      },
      {
        // Terms and versions (Backend spec 019): reads legal.publish or content.edit.
        path: 'dashboard/docs',
        name: 'docs',
        component: () => import('@/pages/docs/index.vue'),
        meta: { title: 'Terms and versions', anyPermissions: [PERMISSIONS.legalPublish, PERMISSIONS.contentEdit] },
      },
      {
        // Market-maker codes (Backend spec 019 FR-060): promo.manage.
        path: 'dashboard/promos',
        name: 'promos',
        component: () => import('@/pages/promos/index.vue'),
        meta: { title: 'Promo codes', permissions: ['promo.manage'] },
      },
      {
        // Market-maker approvals and the cost panel (Backend spec 019 FR-062): market_maker.approve.
        path: 'dashboard/market-maker',
        name: 'market-maker',
        component: () => import('@/pages/market-maker/index.vue'),
        meta: { title: 'Market maker approvals', anyPermissions: ['market_maker.approve', 'promo.manage'] },
      },
      {
        // Switches (Backend spec 019 US7): any of the four switch permissions opens it.
        path: 'dashboard/switches',
        name: 'switches',
        component: () => import('@/pages/switches/index.vue'),
        meta: {
          title: 'Switches',
          anyPermissions: ['category.stop_new', 'category.pause', 'platform.stop_everything', 'visibility.manage'],
        },
      },
      {
        // App text (Backend spec 019): drafts, Publish changes, revert, history, export.
        path: 'dashboard/content',
        name: 'content',
        component: () => import('@/pages/content/index.vue'),
        meta: { title: 'App text', permissions: [PERMISSIONS.contentEdit] },
      },
      {
        // Pricing (Backend spec 005). Changes need their own permissions too.
        path: 'dashboard/pricing',
        name: 'pricing',
        component: () => import('@/pages/pricing/index.vue'),
        meta: { title: 'Gold pricing', permissions: [PERMISSIONS.pricingView] },
      },
      {
        path: 'dashboard/rates',
        name: 'rates',
        component: () => import('@/pages/rates/index.vue'),
        meta: { title: 'Commission rates', permissions: [PERMISSIONS.pricingView] },
      },
      {
        // Reference data (Backend spec 004). Changes need their own permissions too.
        path: 'dashboard/karats',
        name: 'karats',
        component: () => import('@/pages/karats/index.vue'),
        meta: { title: 'Karats', permissions: [PERMISSIONS.referenceView] },
      },
      {
        path: 'dashboard/branches',
        name: 'branches',
        component: () => import('@/pages/branches/index.vue'),
        meta: { title: 'Branches and hours', permissions: [PERMISSIONS.referenceView] },
      },
      {
        // Founder-account security (Backend spec 021): founders, plus holders of
        // founder.unfreeze_second, who see only the freezes.
        path: 'dashboard/security',
        name: 'security',
        component: () => import('@/pages/security/index.vue'),
        meta: { title: 'Security', founderOnly: true, founderOr: PERMISSIONS.founderUnfreezeSecond },
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/pages/forbidden.vue'),
        meta: { title: 'Access denied' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/pages/not-found.vue'),
        meta: { title: 'Page not found' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(companyMiddleware)

export default router
