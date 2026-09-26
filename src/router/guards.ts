import type { LocationQueryValue, RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Single entry point for route protection. Order matters:
//   1. restore the session once (the app shows a loader meanwhile)
//   2. keep signed-in staff out of login / MFA
//   3. send everyone else without a session to login, or to the pending MFA step
//   4. enforce route.meta.permissions, otherwise show 403
// The backend stays the final authority; this only keeps the UI honest.
export async function companyMiddleware (to: RouteLocationNormalized): Promise<RouteLocationRaw | true> {
  const auth = useAuthStore()
  await auth.initialize()

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'overview' }
  }

  // The two MFA screens only make sense for the step the Backend asked for.
  if (to.name === 'mfa' || to.name === 'mfa-enroll') {
    if (!auth.pendingMfa) {
      return { name: 'login', query: redirectQuery(to.query.redirect) }
    }
    const step = mfaRouteName(auth.pendingMfa.kind)
    if (to.name !== step) {
      return { name: step, query: redirectQuery(to.query.redirect) }
    }
  }

  const requiresAuth = to.matched.some(r => r.meta.requiresAuth)
  if (requiresAuth && !auth.isAuthenticated) {
    if (auth.pendingMfa) {
      return { name: mfaRouteName(auth.pendingMfa.kind), query: redirectQuery(to.fullPath) }
    }
    return { name: 'login', query: redirectQuery(to.fullPath) }
  }

  const required = to.matched.flatMap(r => r.meta.permissions ?? [])
  if (required.length > 0 && !auth.canAll(required)) {
    return { name: 'forbidden', query: { from: to.fullPath } }
  }

  return true
}

export function mfaRouteName (kind: 'verify' | 'enroll'): 'mfa' | 'mfa-enroll' {
  return kind === 'enroll' ? 'mfa-enroll' : 'mfa'
}

// Only same-site paths are followed after sign-in, never full URLs.
export function safeRedirect (value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const target = Array.isArray(value) ? value[0] : value
  if (target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/login') && !target.startsWith('/mfa')) {
    return target
  }
  return '/dashboard/overview'
}

function redirectQuery (value: LocationQueryValue | LocationQueryValue[] | undefined) {
  const target = safeRedirect(value)
  return target === '/dashboard/overview' ? {} : { redirect: target }
}
