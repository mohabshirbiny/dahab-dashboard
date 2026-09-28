import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import Placeholder from '@/pages/dashboard/_placeholder.vue'
import Overview from '@/pages/dashboard/overview.vue'
import Login from '@/pages/login.vue'
import { PERMISSIONS } from '@/types/staff'
import { companyMiddleware } from './guards'

const placeholderChildren: RouteRecordRaw[] = [
  { path: 'listings', name: 'listings', component: Placeholder, meta: { title: 'Listings to review' } },
  { path: 'orders', name: 'orders', component: Placeholder, meta: { title: 'Orders' } },
  { path: 'inspections', name: 'inspections', component: Placeholder, meta: { title: 'Inspections' } },
  { path: 'disputes', name: 'disputes', component: Placeholder, meta: { title: 'Disputes and reports' } },
  { path: 'withdrawals', name: 'withdrawals', component: Placeholder, meta: { title: 'Withdrawals' } },
  { path: 'transfers', name: 'transfers', component: Placeholder, meta: { title: 'Incoming transfers' } },
  { path: 'compensation', name: 'compensation', component: Placeholder, meta: { title: 'Compensation' } },
  { path: 'bankbook', name: 'bankbook', component: Placeholder, meta: { title: 'Bank movements' } },
  { path: 'closing', name: 'closing', component: Placeholder, meta: { title: 'Daily closing' } },
  { path: 'invoices', name: 'invoices', component: Placeholder, meta: { title: 'Invoices' } },
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
