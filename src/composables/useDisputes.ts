import type { DisputeDetail, DisputeFilter, ResolveInput } from '@/types/dispute'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { disputeService } from '@/services/dispute.service'
import { retryTransient } from './queryRetry'
import { listingKeys } from './useListings'
import { orderKeys } from './useOrders'
import { walletKeys } from './useWallet'

export const disputeKeys = {
  all: ['disputes'] as const,
  list: (filter: DisputeFilter, mine: boolean, q: string) => [...disputeKeys.all, 'list', filter, mine, q] as const,
  // Under 'list', so every action that refreshes the lists refreshes the badge too.
  unresolved: () => [...disputeKeys.all, 'list', 'unresolved-count'] as const,
  one: (id: string) => [...disputeKeys.all, 'one', id] as const,
  photo: (id: string, photoId: string) => [...disputeKeys.all, 'photo', id, photoId] as const,
  assignees: () => [...disputeKeys.all, 'assignees'] as const,
}

// Oldest first; "Load more" follows the Backend's cursor.
export function useDisputesQuery (filter: MaybeRefOrGetter<DisputeFilter>, mine: MaybeRefOrGetter<boolean>, q: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => disputeKeys.list(toValue(filter), toValue(mine), toValue(q))),
    queryFn: ({ pageParam }) => disputeService.list(toValue(filter), toValue(mine), toValue(q), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

// The sidebar badge. Callers pass `enabled` from dispute.handle.
export function useUnresolvedDisputeCountQuery (enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: disputeKeys.unresolved(),
    queryFn: () => disputeService.unresolvedCount(),
    enabled: computed(() => toValue(enabled)),
    refetchInterval: 60_000,
    retry: false,
  })
}

export function useDisputeQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => disputeKeys.one(toValue(id) ?? '')),
    queryFn: () => disputeService.show(toValue(id)!),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

// One photo as an object URL for <img>; the caller revokes it.
export function useDisputePhotoQuery (id: MaybeRefOrGetter<string>, photoId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => disputeKeys.photo(toValue(id), toValue(photoId) ?? '')),
    queryFn: async () => {
      const blob = await disputeService.photo(toValue(id), toValue(photoId)!)
      return { url: URL.createObjectURL(blob), type: blob.type }
    },
    enabled: computed(() => toValue(photoId) !== null),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  })
}

export function useDisputeAssigneesQuery (enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: disputeKeys.assignees(),
    queryFn: () => disputeService.assignees(),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

// After a pass-on or a resolution: the dispute, the lists, the orders and — a resolution
// can refund or compensate — every wallet figure and the listings.
function useRefreshAfterDispute () {
  const queryClient = useQueryClient()
  return (dispute?: DisputeDetail) => {
    if (dispute) {
      queryClient.setQueryData(disputeKeys.one(dispute.id), dispute)
    }
    queryClient.invalidateQueries({ queryKey: [...disputeKeys.all, 'list'] })
    queryClient.invalidateQueries({ queryKey: orderKeys.all })
    queryClient.invalidateQueries({ queryKey: listingKeys.all })
    queryClient.invalidateQueries({ queryKey: walletKeys.all })
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }
}

export function usePassOnDispute () {
  const refresh = useRefreshAfterDispute()
  return useMutation({
    mutationFn: (input: { id: string, assigneeId: string, note: string, idempotencyKey: string }) =>
      disputeService.passOn(input.id, input.assigneeId, input.note, input.idempotencyKey),
    onSuccess: dispute => refresh(dispute),
    onError: () => refresh(),
  })
}

export function useResolveDispute () {
  const refresh = useRefreshAfterDispute()
  return useMutation({
    mutationFn: (input: { id: string, resolution: ResolveInput, idempotencyKey: string }) =>
      disputeService.resolve(input.id, input.resolution, input.idempotencyKey),
    onSuccess: dispute => refresh(dispute),
    onError: () => refresh(),
  })
}
