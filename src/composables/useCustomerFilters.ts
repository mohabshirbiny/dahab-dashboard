import { computed } from 'vue'
import { type LocationQuery, useRoute, useRouter } from 'vue-router'
import {
  CUSTOMER_STATUSES,
  type CustomerFilters,
  type CustomerStatus,
  DEFAULT_CUSTOMER_FILTERS,
} from '@/types/customer'

function one (value: LocationQuery[string]): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

function pick<T extends string> (value: string, allowed: ReadonlyArray<T>, fallback: T): T {
  return (allowed as ReadonlyArray<string>).includes(value) ? value as T : fallback
}

// The tab, the page and the open customer live in the URL, so a refresh or the
// browser Back button lands on the same screen.
export function useCustomerFilters () {
  const route = useRoute()
  const router = useRouter()

  const filters = computed<CustomerFilters>(() => {
    const page = Number.parseInt(one(route.query.page), 10)
    return {
      status: pick(one(route.query.status), CUSTOMER_STATUSES, DEFAULT_CUSTOMER_FILTERS.status),
      page: Number.isFinite(page) && page > 0 ? page : 1,
      customer: one(route.query.customer) || null,
    }
  })

  function write (next: CustomerFilters) {
    const query: Record<string, string> = {}
    if (next.status !== DEFAULT_CUSTOMER_FILTERS.status) {
      query.status = next.status
    }
    if (next.page > 1) {
      query.page = String(next.page)
    }
    if (next.customer) {
      query.customer = next.customer
    }
    router.replace({ query })
  }

  // Another tab is another list: back to its first page, with nobody open.
  function setStatus (status: CustomerStatus) {
    write({ status, page: 1, customer: null })
  }

  function setPage (page: number) {
    write({ ...filters.value, page })
  }

  function select (customer: string | null) {
    write({ ...filters.value, customer })
  }

  return { filters, setStatus, setPage, select }
}
