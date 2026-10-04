import type { ExtendableDeadline, ExtensionHours, ExtensionRequestState, InspectionFilters, InspectionInput, OrderFilters } from '@/types/order'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { orderService } from '@/services/order.service'
import { retryTransient } from './queryRetry'
import { listingKeys } from './useListings'

export const orderKeys = {
  all: ['orders'] as const,
  list: (filters: OrderFilters) => [...orderKeys.all, 'list', filters] as const,
  one: (id: string) => [...orderKeys.all, 'one', id] as const,
  workList: (branchId: number | null) => [...orderKeys.all, 'work-list', branchId] as const,
  inspections: (filters: InspectionFilters) => [...orderKeys.all, 'inspections', filters] as const,
  // Spec 014.
  extensionRequests: (state: ExtensionRequestState | 'all', month: string | null) => [...orderKeys.all, 'extension-requests', state, month] as const,
  proxyId: (id: string) => [...orderKeys.all, 'proxy-id', id] as const,
}

// Open orders newest first; "Load more" follows the Backend's cursor.
export function useOrdersQuery (filters: MaybeRefOrGetter<OrderFilters>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => orderKeys.list({ ...toValue(filters) })),
    queryFn: ({ pageParam }) => orderService.list(toValue(filters), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

// One order with its figures, results, ledger, history and what the caller may do.
export function useOrderQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => orderKeys.one(toValue(id) ?? '')),
    queryFn: () => orderService.show(toValue(id)!),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

// The pieces at the branch: receive, inspect, correct, hand over.
export function useWorkListQuery (branchId: MaybeRefOrGetter<number | null>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => orderKeys.workList(toValue(branchId))),
    queryFn: ({ pageParam }) => orderService.workList(toValue(branchId), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    // Pieces arrive at the counter, not from this screen.
    refetchInterval: 60_000,
    retry: retryTransient,
  })
}

export function useInspectionsQuery (filters: MaybeRefOrGetter<InspectionFilters>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => orderKeys.inspections({ ...toValue(filters) })),
    queryFn: ({ pageParam }) => orderService.inspections(toValue(filters), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export type OrderAction
  = | { kind: 'receive' }
    | { kind: 'inspect', input: InspectionInput }
    | { kind: 'propose-price', price: string, reason: string }
    | { kind: 'change-branch', branchId: number, reason: string, extendTo: string | null }
    | { kind: 'extend', which: ExtendableDeadline, newDeadline: string, reason: string }
    | { kind: 'handover', to: 'buyer' | 'seller', code: string, byProxy?: boolean }

function run (orderId: string, action: OrderAction, key: string): Promise<unknown> {
  switch (action.kind) {
    case 'receive': {
      return orderService.receive(orderId, key)
    }
    case 'inspect': {
      return orderService.recordInspection(orderId, action.input, key)
    }
    case 'propose-price': {
      return orderService.proposePrice(orderId, action.price, action.reason, key)
    }
    case 'change-branch': {
      return orderService.changeBranch(orderId, action.branchId, action.reason, action.extendTo, key)
    }
    case 'extend': {
      return orderService.extendDeadline(orderId, action.which, action.newDeadline, action.reason, key)
    }
    case 'handover': {
      return orderService.handover(orderId, action.to, action.code, key, action.byProxy ?? false)
    }
  }
}

// Any staff action on an order. Success or refusal, every order view (lists, the
// detail, the work list, the results) and the listings refresh: a refusal usually
// means the order moved under us.
export function useOrderAction () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string, action: OrderAction, idempotencyKey: string }) =>
      run(input.orderId, input.action, input.idempotencyKey),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
      queryClient.invalidateQueries({ queryKey: listingKeys.all })
    },
  })
}

// Spec 014: sellers' requests for more time — waiting first, or a month of them.
export function useExtensionRequestsQuery (state: MaybeRefOrGetter<ExtensionRequestState | 'all'>, month: MaybeRefOrGetter<string | null>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => orderKeys.extensionRequests(toValue(state), toValue(month))),
    queryFn: ({ pageParam }) => orderService.extensionRequests(toValue(state), toValue(month), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    refetchInterval: 60_000,
    retry: retryTransient,
  })
}

// Accept (with working hours) or refuse; every order view refreshes either way.
export function useAnswerExtension () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string, accept: boolean, hours: ExtensionHours, note: string, idempotencyKey: string }) =>
      input.accept
        ? orderService.acceptExtension(input.id, input.hours, input.note, input.idempotencyKey)
        : orderService.refuseExtension(input.id, input.note, input.idempotencyKey),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

// The proxy's ID photo as an object URL for <img>; the caller revokes it. Each load is audited.
export function useProxyIdQuery (orderId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => orderKeys.proxyId(toValue(orderId) ?? '')),
    queryFn: async () => {
      const blob = await orderService.proxyId(toValue(orderId)!)
      return { url: URL.createObjectURL(blob), type: blob.type }
    },
    enabled: computed(() => toValue(orderId) !== null),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  })
}
