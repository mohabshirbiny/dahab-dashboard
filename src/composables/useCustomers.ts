import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { customerService } from '@/services/customer.service'
import { CUSTOMER_PAGE_SIZE, type CustomerFilters } from '@/types/customer'
import { retryTransient } from './queryRetry'

// The list and the detail only depend on what the Backend filters by, so opening a
// customer does not refetch the list.
type ListFilters = Pick<CustomerFilters, 'status' | 'page'>

export const customerKeys = {
  all: ['customers'] as const,
  list: (filters: ListFilters) => [...customerKeys.all, 'list', filters] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
  counts: () => [...customerKeys.all, 'counts'] as const,
  waitingCount: () => [...customerKeys.all, 'waiting-count'] as const,
}

export function useCustomersQuery (filters: MaybeRefOrGetter<ListFilters>) {
  return useQuery({
    queryKey: computed(() => {
      const { status, page } = toValue(filters)
      return customerKeys.list({ status, page })
    }),
    queryFn: () => {
      const { status, page } = toValue(filters)
      return customerService.listCustomers({ status, page, pageSize: CUSTOMER_PAGE_SIZE })
    },
    placeholderData: keepPreviousData,
    retry: retryTransient,
  })
}

// Every load of the detail is logged by the Backend, so it is not refetched just
// because the window regained focus.
export function useCustomerQuery (id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => customerKeys.detail(toValue(id))),
    queryFn: () => customerService.getCustomer(toValue(id)),
    refetchOnWindowFocus: false,
    retry: retryTransient,
  })
}

// Counts for the tabs. The Backend has no counts endpoint, so the service
// derives them from the list totals.
export function useCustomerCountsQuery () {
  return useQuery({
    queryKey: customerKeys.counts(),
    queryFn: () => customerService.getCounts(),
    retry: false,
  })
}

export function useCustomerWaitingCountQuery (enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: customerKeys.waitingCount(),
    queryFn: () => customerService.getWaitingCount(),
    enabled: computed(() => toValue(enabled)),
    retry: false,
  })
}
