import type { BranchInput, CreateClosureInput, CreateKaratInput } from '@/types/reference'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { referenceService } from '@/services/reference.service'
import { retryTransient } from './queryRetry'
import { accessKeys } from './useAccessControl'

export const referenceKeys = {
  all: ['reference'] as const,
  karats: () => [...referenceKeys.all, 'karats'] as const,
  branches: () => [...referenceKeys.all, 'branches'] as const,
  closures: () => [...referenceKeys.all, 'closures'] as const,
}

export function useKaratsQuery () {
  return useQuery({
    queryKey: referenceKeys.karats(),
    queryFn: () => referenceService.listKarats(),
    retry: retryTransient,
  })
}

export function useBranchesQuery (enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: referenceKeys.branches(),
    queryFn: () => referenceService.listBranches(),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useClosuresQuery () {
  return useQuery({
    queryKey: referenceKeys.closures(),
    queryFn: () => referenceService.listClosures(),
    retry: retryTransient,
  })
}

// Not awaited: dialogs close once the server has confirmed, lists refresh behind.
function useRefresh (key: readonly unknown[]) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: key })
  }
}

export function useCreateKarat () {
  const refresh = useRefresh(referenceKeys.karats())
  return useMutation({
    mutationFn: (input: CreateKaratInput) => referenceService.createKarat(input),
    onSuccess: refresh,
  })
}

export function useToggleKarat () {
  const refresh = useRefresh(referenceKeys.karats())
  return useMutation({
    mutationFn: (input: { code: number, enabled: boolean }) => referenceService.toggleKarat(input.code, input.enabled),
    onSuccess: refresh,
  })
}

export function useSaveBranch () {
  const refresh = useRefresh(referenceKeys.branches())
  return useMutation({
    mutationFn: (input: BranchInput & { id: number | null }) =>
      input.id === null ? referenceService.createBranch(input) : referenceService.updateBranch(input.id, input),
    onSuccess: refresh,
  })
}

export function useCreateClosure () {
  const refresh = useRefresh(referenceKeys.closures())
  return useMutation({
    mutationFn: (input: CreateClosureInput) => referenceService.createClosure(input),
    onSuccess: refresh,
  })
}

export function useDeleteClosure () {
  const refresh = useRefresh(referenceKeys.closures())
  return useMutation({
    mutationFn: (id: number) => referenceService.deleteClosure(id),
    onSuccess: refresh,
  })
}

// A staff member's branch narrows their branch-scoped permissions, so the staff
// list is refreshed like any other access change.
export function useSetStaffBranch () {
  const refresh = useRefresh(accessKeys.all)
  return useMutation({
    mutationFn: (input: { id: string, branchId: number | null, reason: string }) =>
      referenceService.setStaffBranch(input.id, input.branchId, input.reason),
    onSuccess: refresh,
  })
}
