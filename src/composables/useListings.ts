import type { ListingDecision, ListingDetail, ListingQueue } from '@/types/listing'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { listingService } from '@/services/listing.service'
import { retryTransient } from './queryRetry'

export const listingKeys = {
  all: ['listings'] as const,
  list: (queue: ListingQueue) => [...listingKeys.all, 'list', queue] as const,
  // Under 'list', so every decision that refreshes the lists refreshes the badge too.
  waitingCount: () => [...listingKeys.all, 'list', 'waiting-count'] as const,
  one: (id: string) => [...listingKeys.all, 'one', id] as const,
  media: (id: string, mediaId: string, use: 'thumb' | 'full') => [...listingKeys.all, 'media', id, mediaId, use] as const,
}

// Waiting listings oldest first, the other queues most recent first; "Load more"
// follows the Backend's cursor.
export function useListingsQuery (queue: MaybeRefOrGetter<ListingQueue>) {
  return useInfiniteQuery({
    queryKey: computed(() => listingKeys.list(toValue(queue))),
    queryFn: ({ pageParam }) => listingService.list(toValue(queue), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    retry: retryTransient,
  })
}

// The sidebar badge. Callers pass `enabled` from the listing permissions, so staff
// without them never send the request.
export function useWaitingListingCountQuery (enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: listingKeys.waitingCount(),
    queryFn: () => listingService.waitingCount(),
    enabled: computed(() => toValue(enabled)),
    // New listings arrive from sellers, not from this screen.
    refetchInterval: 60_000,
    retry: false,
  })
}

// One listing with its history and counters, for the review panel.
export function useListingQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => listingKeys.one(toValue(id) ?? '')),
    queryFn: () => listingService.show(toValue(id)!),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

// One file as an object URL for <img>, <video> or <iframe>; the caller revokes it.
// `use` keeps the thumbnail and the full-size preview apart: each owns (and revokes)
// its own URL.
export function useListingMediaQuery (id: MaybeRefOrGetter<string>, mediaId: MaybeRefOrGetter<string | null>, use: 'thumb' | 'full') {
  return useQuery({
    queryKey: computed(() => listingKeys.media(toValue(id), toValue(mediaId) ?? '', use)),
    queryFn: async () => {
      const blob = await listingService.media(toValue(id), toValue(mediaId)!)
      return { url: URL.createObjectURL(blob), type: blob.type }
    },
    enabled: computed(() => toValue(mediaId) !== null),
    staleTime: Infinity,
    gcTime: 0,
    retry: retryTransient,
  })
}

// Approve, ask for changes, reject or take down. The result replaces the listing in
// the cache and every queue (and the badge) is refreshed.
export function useDecideListing () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string, decision: ListingDecision, note: string | null, idempotencyKey: string }) =>
      listingService.decide(input.id, input.decision, input.note, input.idempotencyKey),
    onSuccess: (listing: ListingDetail) => {
      queryClient.setQueryData(listingKeys.one(listing.id), listing)
      queryClient.invalidateQueries({ queryKey: [...listingKeys.all, 'list'] })
    },
    // A refusal usually means the listing moved under us: show its real state.
    onError: (_error, input) => {
      queryClient.invalidateQueries({ queryKey: listingKeys.one(input.id) })
      queryClient.invalidateQueries({ queryKey: [...listingKeys.all, 'list'] })
    },
  })
}
