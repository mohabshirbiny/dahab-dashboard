import type { CreateRoleInput, UpdateRoleInput } from '@/types/access'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { accessService } from '@/services/access.service'
import { useAuthStore } from '@/stores/auth'
import { STAFF_PAGE_SIZE } from '@/types/access'
import { retryTransient } from './queryRetry'

export const accessKeys = {
  all: ['access'] as const,
  permissions: () => [...accessKeys.all, 'permissions'] as const,
  roles: () => [...accessKeys.all, 'roles'] as const,
  staff: (page: number) => [...accessKeys.all, 'staff', page] as const,
}

export function usePermissionCatalogueQuery (enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: accessKeys.permissions(),
    queryFn: () => accessService.listPermissions(),
    enabled: computed(() => toValue(enabled)),
    // The catalogue only changes with a Backend release.
    staleTime: 10 * 60 * 1000,
    retry: retryTransient,
  })
}

export function useRolesQuery (enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: accessKeys.roles(),
    queryFn: () => accessService.listRoles(),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useStaffQuery (page: MaybeRefOrGetter<number>) {
  return useQuery({
    queryKey: computed(() => accessKeys.staff(toValue(page))),
    queryFn: () => accessService.listStaff({ page: toValue(page), pageSize: STAFF_PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: retryTransient,
  })
}

// Any change to roles or assignments can change holder counts, staff permission
// lists and (for other sessions) what people may do, so every access query is
// refreshed afterwards. The signed-in person's own permissions are re-read too:
// a change made elsewhere to a role they hold applies on their next request.
function useRefreshAccess () {
  const queryClient = useQueryClient()
  const auth = useAuthStore()
  // Not awaited: the dialog closes as soon as the server has confirmed the change,
  // and the lists refresh in the background.
  return () => {
    void queryClient.invalidateQueries({ queryKey: accessKeys.all })
    void auth.refreshProfile()
  }
}

export function useCreateRole () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: CreateRoleInput) => accessService.createRole(input),
    onSuccess: refresh,
  })
}

export function useUpdateRole () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: UpdateRoleInput & { name: string }) => accessService.updateRole(input.name, input),
    onSuccess: refresh,
  })
}

export function useDeleteRole () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: { name: string, reason: string }) => accessService.deleteRole(input.name, input.reason),
    onSuccess: refresh,
  })
}

export function useSetStaffRoles () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: { id: string, roles: string[], reason: string }) =>
      accessService.setStaffRoles(input.id, input.roles, input.reason),
    onSuccess: refresh,
  })
}
