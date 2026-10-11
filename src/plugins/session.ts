import type { Router } from 'vue-router'
import { setAccountFrozenHandler, setSessionExpiredHandler } from '@/api/session'
import { useAuthStore } from '@/stores/auth'

// When the API client cannot renew the session (the refresh token is expired,
// revoked or replayed), the person is signed out and sent to the login screen,
// then back to where they were once they sign in again.
export default function installSessionExpiry (router: Router) {
  setSessionExpiredHandler(() => {
    const auth = useAuthStore()
    auth.clearSession()

    const current = router.currentRoute.value
    // Public screens need no redirect. At start-up the route is not resolved yet
    // and the navigation guard sends the person to login itself.
    if (current.matched.some(r => r.meta.requiresAuth)) {
      router.replace({ name: 'login', query: { redirect: current.fullPath } })
    }
  })

  // Backend spec 021: frozen by the other founder while signed in. The session is dropped
  // locally (the Backend already deleted every token) and the frozen screen explains it.
  setAccountFrozenHandler(() => {
    const auth = useAuthStore()
    const email = auth.user?.email ?? null
    auth.clearSession()
    auth.markFrozen(email)
    if (router.currentRoute.value.name !== 'frozen') {
      router.replace({ name: 'frozen' })
    }
  })
}
