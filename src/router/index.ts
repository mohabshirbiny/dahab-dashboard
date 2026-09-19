import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import Overview from '@/pages/dashboard/overview.vue'
import Placeholder from '@/pages/dashboard/_placeholder.vue'
import Login from '@/pages/login.vue'
import { companyMiddleware } from './guards'

const placeholderChildren: RouteRecordRaw[] = [
  { path: 'listings', name: 'listings', component: Placeholder, meta: { title: 'Listings to review' } },
  { path: 'orders', name: 'orders', component: Placeholder, meta: { title: 'Orders' } },
  { path: 'inspections', name: 'inspections', component: Placeholder, meta: { title: 'Inspections' } },
  { path: 'disputes', name: 'disputes', component: Placeholder, meta: { title: 'Disputes and reports' } },
  { path: 'withdrawals', name: 'withdrawals', component: Placeholder, meta: { title: 'Withdrawals' } },
  { path: 'transfers', name: 'transfers', component: Placeholder, meta: { title: 'Incoming transfers' } },
  { path: 'statement', name: 'statement', component: Placeholder, meta: { title: 'Wallet statement' } },
  { path: 'compensation', name: 'compensation', component: Placeholder, meta: { title: 'Compensation' } },
  { path: 'bankbook', name: 'bankbook', component: Placeholder, meta: { title: 'Bank movements' } },
  { path: 'closing', name: 'closing', component: Placeholder, meta: { title: 'Daily closing' } },
  { path: 'invoices', name: 'invoices', component: Placeholder, meta: { title: 'Invoices' } },
  { path: 'pricing', name: 'pricing', component: Placeholder, meta: { title: 'Gold pricing' } },
  { path: 'rates', name: 'rates', component: Placeholder, meta: { title: 'Commission rates' } },
  { path: 'promos', name: 'promos', component: Placeholder, meta: { title: 'Promo codes' } },
  { path: 'market-maker', name: 'market-maker', component: Placeholder, meta: { title: 'Market maker approvals' } },
  { path: 'karats', name: 'karats', component: Placeholder, meta: { title: 'Karats' } },
  { path: 'switches', name: 'switches', component: Placeholder, meta: { title: 'Switches' } },
  { path: 'branches', name: 'branches', component: Placeholder, meta: { title: 'Branches and hours' } },
  { path: 'content', name: 'content', component: Placeholder, meta: { title: 'App text' } },
  { path: 'docs', name: 'docs', component: Placeholder, meta: { title: 'Terms and versions' } },
  { path: 'customer', name: 'customer', component: Placeholder, meta: { title: 'Customer file' } },
  { path: 'users', name: 'users', component: Placeholder, meta: { title: 'Users and verification' } },
  { path: 'staff', name: 'staff', component: Placeholder, meta: { title: 'Staff and permissions' } },
  { path: 'audit', name: 'audit', component: Placeholder, meta: { title: 'Audit log' } },
]

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard/overview' },
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  {
    path: '/dashboard',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard/overview' },
      { path: 'overview', name: 'overview', component: Overview, meta: { title: 'Overview' } },
      ...placeholderChildren,
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard/overview' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(companyMiddleware)

export default router
