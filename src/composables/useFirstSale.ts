import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { http } from '@/api/axios'
import { retryTransient } from './queryRetry'

// The first-sale advance, staff side (Backend spec 023 Story 1.5; permission first_sale.manage).
// Plain shapes: the Backend's own names.

export type AdvanceStatus = 'outstanding' | 'recovered' | 'written_off'

export interface AdvanceRow {
  advance_id: string
  order_ref: string | null
  seller: { display_ref: string | null, full_name: string | null }
  amount_egp: string
  basis: 'promo_code' | 'staff_enablement'
  promo_code: string | null
  status: AdvanceStatus
  advanced_at: string
  recovered_egp: string | null
  shortfall_absorbed_egp: string | null
  written_off_reason: string | null
}

export interface ExposureMeta {
  enabled: boolean
  cap_egp: string
  ceiling_egp: string
  outstanding_egp: string
  outstanding_count: number
  headroom_egp: string
  written_off_total_egp: string
  shortfall_total_egp: string
  next_cursor: string | null
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })
const root = ['first-sale'] as const

export function useFirstSaleAdvances (status: MaybeRefOrGetter<AdvanceStatus | null> = null, enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: computed(() => [...root, 'advances', toValue(status)]),
    queryFn: async () => (await http.get<{ data: AdvanceRow[], meta: ExposureMeta }>('/dashboard/first-sale-advances', {
      params: { status: toValue(status) ?? undefined },
    })).data,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useEnableFirstSale () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { customerId: string, reason: string, idempotencyKey: string }) =>
      (await http.post(`/dashboard/customers/${input.customerId}/first-sale-advance`, { reason: input.reason }, keyHeader(input.idempotencyKey))).data,
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useRevokeFirstSale () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { customerId: string, reason?: string, idempotencyKey: string }) =>
      (await http.delete(`/dashboard/customers/${input.customerId}/first-sale-advance`, { ...keyHeader(input.idempotencyKey), data: { reason: input.reason } })).data,
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
