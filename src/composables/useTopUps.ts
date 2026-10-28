import type { CreditByHandInput, MatchTopUpInput, TopUp, TopUpListQuery, TopUpRejectReason } from '@/types/topup'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { topUpService } from '@/services/topup.service'
import { retryTransient } from './queryRetry'
import { walletKeys } from './useWallet'

export const topUpKeys = {
  all: ['topups'] as const,
  list: (query: TopUpListQuery) => [...topUpKeys.all, 'list', query] as const,
  one: (id: string) => [...topUpKeys.all, 'one', id] as const,
  receipt: (id: string) => [...topUpKeys.all, 'receipt', id] as const,
}

// Newest first; "Load more" follows the Backend's cursor.
export function useTopUpsQuery (query: MaybeRefOrGetter<TopUpListQuery>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => topUpKeys.list({ ...toValue(query) })),
    queryFn: ({ pageParam }) => topUpService.list(toValue(query), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

// One transfer, for the detail dialog; actions replace it in the cache.
export function useTopUpQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => topUpKeys.one(toValue(id) ?? '')),
    queryFn: () => topUpService.show(toValue(id)!),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

// The receipt as an object URL for <img>/<iframe>; the caller revokes it.
export function useTopUpReceiptQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => topUpKeys.receipt(toValue(id) ?? '')),
    queryFn: async () => {
      const blob = await topUpService.receipt(toValue(id)!)
      return { url: URL.createObjectURL(blob), type: blob.type }
    },
    enabled: computed(() => toValue(id) !== null),
    staleTime: Infinity,
    gcTime: 0,
    retry: retryTransient,
  })
}

// After any change: the list, the transfer and — when money moved — every wallet figure.
function useApply (moved: boolean) {
  const queryClient = useQueryClient()
  return (topUp: TopUp) => {
    queryClient.setQueryData(topUpKeys.one(topUp.id), topUp)
    queryClient.invalidateQueries({ queryKey: [...topUpKeys.all, 'list'] })
    if (moved) {
      queryClient.invalidateQueries({ queryKey: walletKeys.all })
    }
  }
}

export function useMatchTopUp () {
  const apply = useApply(true)
  return useMutation({
    mutationFn: (input: { id: string, idempotencyKey: string } & MatchTopUpInput) =>
      topUpService.match(input.id, input, input.idempotencyKey),
    onSuccess: apply,
  })
}

export function useHoldTopUp () {
  const apply = useApply(false)
  return useMutation({
    mutationFn: (input: { id: string, note: string, idempotencyKey: string }) => topUpService.hold(input.id, input.note, input.idempotencyKey),
    onSuccess: apply,
  })
}

export function useUnholdTopUp () {
  const apply = useApply(false)
  return useMutation({
    mutationFn: (input: { id: string, idempotencyKey: string }) => topUpService.unhold(input.id, input.idempotencyKey),
    onSuccess: apply,
  })
}

export function useRejectTopUp () {
  const apply = useApply(false)
  return useMutation({
    mutationFn: (input: { id: string, reason: TopUpRejectReason, note: string, idempotencyKey: string }) =>
      topUpService.reject(input.id, { reason: input.reason, note: input.note }, input.idempotencyKey),
    onSuccess: apply,
  })
}

export function useCreditByHand () {
  const apply = useApply(true)
  return useMutation({
    mutationFn: (input: CreditByHandInput & { idempotencyKey: string }) => topUpService.creditByHand(input, input.idempotencyKey),
    onSuccess: apply,
  })
}

export function useExportTopUps () {
  return useMutation({
    mutationFn: async (query: TopUpListQuery) => {
      const result = await topUpService.exportCsv(query)
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      link.click()
      URL.revokeObjectURL(url)
      return result
    },
  })
}
