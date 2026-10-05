import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import Placeholder from '@/pages/dashboard/_placeholder.vue'
import Overview from '@/pages/dashboard/overview.vue'
import Login from '@/pages/login.vue'
import { PERMISSIONS } from '@/types/staff'
import { companyMiddleware } from './guards'

const placeholderChildren: RouteRecordRaw[] = [
  { path: 'promos', name: 'promos', component: Placeholder, meta: { title: 'Promo codes' } },
  { path: 'market-maker', name: 'market-maker', component: Placeholder, meta: { title: 'Market maker approvals' } },
  { path: 'switches', name: 'switches', component: Placeholder, meta: { title: 'Switches' } },
  { path: 'content', name: 'content', component: Placeholder, meta: { title: 'App text' } },
  { path: 'docs', name: 'docs', component: Placeholder, meta: { title: 'Terms and versions' } },
].map(route => ({ ...route, path: `dashboard/${route.path}` }))

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { public: true, guestOnly: true, title: 'Sign in' },
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
    // One layout for every signed-in screen, so the sidebar survives navigation.
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'overview' } },
      { path: 'dashboard', redirect: { name: 'overview' } },
      { path: 'dashboard/overview', name: 'overview', component: Overview, meta: { title: 'Overview' } },
      ...placeholderChildren,
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
        meta: { title: 'Disputes and reports', permissions: [PERMISSIONS.disputeHandle] },
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
