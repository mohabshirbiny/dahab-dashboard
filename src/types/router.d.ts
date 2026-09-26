import type { Permission } from './staff'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    // Reachable without a session.
    public?: boolean
    requiresAuth?: boolean
    // Login and MFA: signed-in staff are sent to the dashboard instead.
    guestOnly?: boolean
    // The signed-in staff member needs every one of these.
    permissions?: Permission[]
  }
}
