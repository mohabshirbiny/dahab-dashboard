import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Placeholder for a future `companyMiddleware`-style flow.
// When real auth exists, this is the single place to add:
//   - token refresh
//   - company context resolution
//   - role/permission gates from route.meta.roles
export function companyMiddleware (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const auth = useAuthStore()
  const isPublic = to.matched.some(r => r.meta.public)
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth)

  if (!isPublic && requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return next({ name: 'overview' })
  }
  return next()
}
