import type { DeviceApprovalState } from '@/types/security'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { securityService } from '@/services/security.service'
import { retryTransient } from './queryRetry'

// Founder-account security (Backend spec 021).
export const securityKeys = {
  all: ['founder-security'] as const,
  approvals: (status: DeviceApprovalState | 'all', page: number) => [...securityKeys.all, 'approvals', status, page] as const,
  devices: () => [...securityKeys.all, 'devices'] as const,
  freezes: (state: 'open' | 'all', page: number) => [...securityKeys.all, 'freezes', state, page] as const,
}

// Pending requests expire after 15 minutes, so the list refreshes every 15 seconds.
export function useDeviceApprovalsQuery (
  status: MaybeRefOrGetter<DeviceApprovalState | 'all'>,
  page: MaybeRefOrGetter<number> = 1,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => securityKeys.approvals(toValue(status), toValue(page))),
    queryFn: () => securityService.listApprovals(toValue(status), toValue(page)),
    enabled: computed(() => toValue(enabled)),
    refetchInterval: computed(() => (toValue(status) === 'pending' ? 15_000 : false)),
    retry: retryTransient,
  })
}

export function useFounderDevicesQuery (enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: securityKeys.devices(),
    queryFn: () => securityService.devices(),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useFreezesQuery (
  state: MaybeRefOrGetter<'open' | 'all'>,
  page: MaybeRefOrGetter<number> = 1,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery({
    queryKey: computed(() => securityKeys.freezes(toValue(state), toValue(page))),
    queryFn: () => securityService.listFreezes(toValue(state), toValue(page)),
    enabled: computed(() => toValue(enabled)),
    refetchInterval: 30_000,
    retry: retryTransient,
  })
}

// After any decision: every list on the page reloads.
function useRefreshSecurity () {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: securityKeys.all })
}

export function useDecideDevice () {
  const refresh = useRefreshSecurity()
  return useMutation({
    mutationFn: (input: { id: string, decision: 'approve' | 'refuse', note: string | null, idempotencyKey: string }) =>
      input.decision === 'approve'
        ? securityService.approve(input.id, input.note, input.idempotencyKey)
        : securityService.refuse(input.id, input.note, input.idempotencyKey),
    onSettled: () => refresh(),
  })
}

export function useFreezeFounder () {
  const refresh = useRefreshSecurity()
  return useMutation({
    mutationFn: (input: { staffId: string, reason: string, idempotencyKey: string }) =>
      securityService.freeze(input.staffId, input.reason, input.idempotencyKey),
    onSettled: () => refresh(),
  })
}

export function useConfirmUnfreeze () {
  const refresh = useRefreshSecurity()
  return useMutation({
    mutationFn: (input: { freezeId: string, note: string | null, idempotencyKey: string }) =>
      securityService.confirmUnfreeze(input.freezeId, input.note, input.idempotencyKey),
    onSettled: () => refresh(),
  })
}
