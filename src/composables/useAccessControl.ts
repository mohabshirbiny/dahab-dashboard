import type { CreateRoleInput, CreateStaffInput, StaffStatusFilter, UpdateRoleInput, UpdateStaffInput } from '@/types/access'
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
  staff: (page: number, status: StaffStatusFilter = 'all') => [...accessKeys.all, 'staff', page, status] as const,
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

export function useStaffQuery (page: MaybeRefOrGetter<number>, status: MaybeRefOrGetter<StaffStatusFilter> = 'all') {
  return useQuery({
    queryKey: computed(() => accessKeys.staff(toValue(page), toValue(status))),
    queryFn: () => accessService.listStaff({ page: toValue(page), pageSize: STAFF_PAGE_SIZE, status: toValue(status) }),
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

// Create, disable and enable staff accounts (Backend spec 020). `key` is the form's Idempotency-Key.
export function useCreateStaff () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: { staff: CreateStaffInput, key: string }) => accessService.createStaff(input.staff, input.key),
    onSuccess: refresh,
  })
}

export function useDisableStaff () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: { id: string, reason: string, key: string }) => accessService.disableStaff(input.id, input.reason, input.key),
    onSuccess: refresh,
  })
}

// Edit a member's details and delete a member (Backend docs/features/staff-edit-delete.md).
export function useUpdateStaff () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: { id: string, staff: UpdateStaffInput, key: string }) => accessService.updateStaff(input.id, input.staff, input.key),
    onSuccess: refresh,
  })
}

export function useDeleteStaff () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: { id: string, reason: string, key: string }) => accessService.deleteStaff(input.id, input.reason, input.key),
    onSuccess: refresh,
  })
}

export function useEnableStaff () {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (input: { id: string, reason: string, key: string }) => accessService.enableStaff(input.id, input.reason, input.key),
    onSuccess: refresh,
  })
}
