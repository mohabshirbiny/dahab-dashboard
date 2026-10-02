import type { BuyRequestFilters } from '@/types/buyRequest'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { buyRequestService } from '@/services/buy-request.service'
import { retryTransient } from './queryRetry'

export const buyRequestKeys = {
  all: ['buy-requests'] as const,
  list: (filters: BuyRequestFilters) => [...buyRequestKeys.all, 'list', filters] as const,
}

// Every buy request across listings, soonest seller-reply deadline first (read-only).
export function useBuyRequestsQuery (filters: MaybeRefOrGetter<BuyRequestFilters>) {
  return useInfiniteQuery({
    queryKey: computed(() => buyRequestKeys.list({ ...toValue(filters) })),
    queryFn: ({ pageParam }) => buyRequestService.list(toValue(filters), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    // Requests arrive and expire on their own; keep the line current.
    refetchInterval: 60_000,
    retry: retryTransient,
  })
}
