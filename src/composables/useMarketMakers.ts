import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { http } from '@/api/axios'
import { retryTransient } from './queryRetry'

// Market makers, staff side (Backend spec 019 US6 / 6A). Plain shapes: the Backend's own names.

export interface PromoCodeRow {
  code: string
  kind: string
  customer: { id: string, display_ref: string, full_name: string } | null
  monthly_cap_egp: string | null
  is_active: boolean
  uses_this_month: number
  created_at: string
}

export interface PromoUseRow {
  used_at: string
  customer: { display_ref: string | null, full_name: string | null }
  allowed: boolean
  block_reason: string | null
  order_id: string | null
}

export interface QueueRow {
  listing_id: string
  title: string
  category: string
  karat: number | null
  weight_g: string | null
  asking_price: string | null
  current_price: string | null
  gold_value: string | null
  listed_at: string | null
  days_listed: number
  views: number | null
}

export interface ApprovalRow {
  approval_id: string
  listing_id: string
  title: string | null
  asking_price: string
  gold_value: string | null
  rapaport_guide: string | null
  approved_by: { id: string, full_name: string } | null
  approved_at: string
}

export interface CostPanel {
  month: string
  pieces_bought: number
  value_egp: string
  spread_paid_to_dealers_egp: string
  commission_waived: boolean
}

const keyHeader = (idempotencyKey: string) => ({ headers: { 'Idempotency-Key': idempotencyKey } })
const root = ['market-makers'] as const

export function usePromoCodes () {
  return useQuery({
    queryKey: [...root, 'codes'],
    queryFn: async () => (await http.get<{ data: PromoCodeRow[] }>('/dashboard/promo-codes')).data.data,
    retry: retryTransient,
  })
}

export function usePromoUses (code: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => [...root, 'uses', toValue(code)]),
    queryFn: async () => (await http.get<{ data: PromoUseRow[] }>(`/dashboard/promo-codes/${encodeURIComponent(toValue(code) as string)}/uses`)).data.data,
    enabled: computed(() => toValue(code) !== null),
    retry: retryTransient,
  })
}

export function useMarketMakerQueue () {
  return useQuery({
    queryKey: [...root, 'queue'],
    queryFn: async () => (await http.get<{ data: QueueRow[], meta: { min_list_age_days: number } }>('/dashboard/market-maker/queue')).data,
    retry: retryTransient,
  })
}

export function useApprovals () {
  return useQuery({
    queryKey: [...root, 'approvals'],
    queryFn: async () => (await http.get<{ data: ApprovalRow[] }>('/dashboard/market-maker/approvals')).data.data,
    retry: retryTransient,
  })
}

export function useCostPanel (month: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => [...root, 'cost', toValue(month)]),
    queryFn: async () => (await http.get<{ data: CostPanel }>('/dashboard/market-maker/cost', { params: { month: toValue(month) } })).data.data,
    retry: retryTransient,
  })
}

function useRefresh () {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: root })
}

export function useCreatePromoCode () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: { code: string, customerId: string, monthlyCap: string, idempotencyKey: string }) =>
      (await http.post('/dashboard/promo-codes', {
        code: input.code,
        tied_customer_id: input.customerId,
        monthly_cap_egp: input.monthlyCap === '' ? undefined : input.monthlyCap,
      }, keyHeader(input.idempotencyKey))).data,
    onSuccess: refresh,
  })
}

export function useUpdatePromoCode () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: { code: string, active?: boolean, monthlyCap?: string | null, idempotencyKey: string }) =>
      (await http.patch(`/dashboard/promo-codes/${encodeURIComponent(input.code)}`, {
        active: input.active,
        monthly_cap_egp: input.monthlyCap,
      }, keyHeader(input.idempotencyKey))).data,
    onSuccess: refresh,
  })
}

export function useApprovePiece () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: { listingId: string, askingPriceSeen: string, goldValueSeen: string | null, idempotencyKey: string }) =>
      (await http.post('/dashboard/market-maker/approvals', {
        listing_id: input.listingId,
        asking_price_seen: input.askingPriceSeen,
        gold_value_seen: input.goldValueSeen ?? undefined,
      }, keyHeader(input.idempotencyKey))).data,
    onSuccess: refresh,
  })
}
