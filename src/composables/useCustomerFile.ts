import type { CustomerFile, SuspendedReason } from '@/types/customer'
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { customerService } from '@/services/customer.service'
import { retryTransient } from './queryRetry'
import { customerKeys } from './useCustomers'

// Customer file (Backend spec 007). The file itself is `useCustomerQuery` (the same
// audited endpoint the Users panel reads); this module holds the file's other reads.
export { useCustomerQuery as useCustomerFileQuery } from './useCustomers'

export const customerFileKeys = {
  search: (q: string) => [...customerKeys.all, 'search', q] as const,
  activity: (id: string) => [...customerKeys.all, 'activity', id] as const,
  sessions: (id: string, page: number) => [...customerKeys.all, 'sessions', id, page] as const,
  notifications: (id: string) => [...customerKeys.all, 'notifications', id] as const,
}

// What the customer was sent (Backend spec 017 FR-035): keyset pages, "Load more".
export function useCustomerNotificationsQuery (id: MaybeRefOrGetter<string>) {
  return useInfiniteQuery({
    queryKey: computed(() => customerFileKeys.notifications(toValue(id))),
    queryFn: ({ pageParam }) => customerService.getNotifications(toValue(id), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    retry: retryTransient,
  })
}

// History: keyset pages ("Load more" follows the cursor). Only for staff who hold an
// audit permission; the Backend refuses everyone else.
export function useCustomerHistoryQuery (id: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return useInfiniteQuery({
    queryKey: computed(() => customerFileKeys.activity(toValue(id))),
    queryFn: ({ pageParam }) => customerService.getActivity(toValue(id), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useCustomerSessionsQuery (id: MaybeRefOrGetter<string>, page: MaybeRefOrGetter<number>) {
  return useQuery({
    queryKey: computed(() => customerFileKeys.sessions(toValue(id), toValue(page))),
    queryFn: () => customerService.getSessions(toValue(id), toValue(page)),
    placeholderData: keepPreviousData,
    retry: retryTransient,
  })
}

// People → Customer file: exact match on the reference or the phone, any status.
export function useCustomerSearchQuery (q: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => customerFileKeys.search(toValue(q))),
    queryFn: () => customerService.searchCustomers(toValue(q)),
    enabled: computed(() => toValue(q).length > 0),
    retry: retryTransient,
  })
}

// The response is the updated file, so it replaces the cached one: refetching the
// file would write another "file opened" audit entry. Lists and counts do refetch.
function useApplyFile () {
  const queryClient = useQueryClient()
  return (file: CustomerFile) => {
    queryClient.setQueryData(customerKeys.detail(file.id), file)
    // History gains the suspend / reinstate entry.
    for (const part of ['list', 'counts', 'waiting-count', 'search', 'activity']) {
      queryClient.invalidateQueries({ queryKey: [...customerKeys.all, part] })
    }
  }
}

// Mutations never retry on their own: a retry is the user's, with the same key.
export function useSuspendCustomer (id: MaybeRefOrGetter<string>) {
  const apply = useApplyFile()
  return useMutation({
    mutationFn: (input: { reason: SuspendedReason, note: string, idempotencyKey: string }) =>
      customerService.suspend(toValue(id), { reason: input.reason, note: input.note }, input.idempotencyKey),
    onSuccess: apply,
  })
}

export function useReinstateCustomer (id: MaybeRefOrGetter<string>) {
  const apply = useApplyFile()
  return useMutation({
    mutationFn: (input: { note: string, idempotencyKey: string }) =>
      customerService.reinstate(toValue(id), { note: input.note }, input.idempotencyKey),
    onSuccess: apply,
  })
}
