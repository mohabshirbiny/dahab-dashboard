import type { Permission } from '@/types/staff'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

// The one way UI code asks "may this person do that?".
// It reads explicit backend permissions, never roles. This only shapes the UI:
// the Backend checks every request itself.
export function usePermissions () {
  const auth = useAuthStore()
  const { user } = storeToRefs(auth)

  return {
    permissions: computed<readonly string[]>(() => user.value?.permissions ?? []),
    can: (permission: Permission) => auth.can(permission),
    canAll: (permissions: readonly Permission[]) => auth.canAll(permissions),
  }
}
