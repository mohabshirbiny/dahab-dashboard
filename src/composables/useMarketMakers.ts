import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { http } from '@/api/axios'
import { retryTransient } from './queryRetry'

// Promo codes and market makers, staff side (Backend spec 019 US6 / 6A, spec 023 Stories 5-6).
// Plain shapes: the Backend's own names.

export type CommissionMode = 'waive' | 'percent' | 'amount' | 'none'
export type ProductType = 'gold' | 'diamond' | 'gold_with_diamond'
export type DepositMode = 'none' | 'percent' | 'amount'
export type UseLimit = 'unlimited' | 'once' | 'monthly'

export interface PromoCodeRow {
  code: string
  kind: 'market_maker' | 'first_sale' | 'discount' | 'buyer' | string
  side?: 'seller' | 'buyer'
  // null: every product (dealer and first-sale codes, and seller codes made before products).
  product_type?: ProductType | null
  customer: { id: string, display_ref: string, full_name: string } | null
  what_it_does: {
    commission: { mode: CommissionMode, percent: string | null, amount_egp?: string | null }
    deposit?: { mode: DepositMode, percent: string | null, amount_egp: string | null }
    // A buyer code's discount off the price and what pays for it (2026-10-26).
    price?: { mode: 'none' | 'percent' | 'amount', percent: string | null, amount_egp: string | null, funded_by: 'commission' | 'spread' | null }
    gives_spread: boolean
    pays_advance: boolean
  }
  tied_to:
    | { audience: 'anyone' }
    | { audience: 'account', customer: { id: string, display_ref: string, full_name: string, phone_masked: string | null } }
  first_sale_only: boolean
  conditions: {
    use_limit: UseLimit
    // Only for dealer codes (effective values); null otherwise.
    min_listed_days: number | null
    requires_approval: boolean | null
    starts_on: string | null
    ends_on: string | null
  }
  monthly_cap_egp: string | null
  is_active: boolean
  uses_this_month: number
  value_this_month_egp: string
  created_at: string
  // Something points at the code (a use, credit, request, listing or advance): its terms stay and it
  // cannot be deleted; only the cap, the end date and the on/off change (2026-10-26).
  in_use?: boolean
}

export interface PromoUseRow {
  used_at: string
  customer: { display_ref: string | null, full_name: string | null }
  allowed: boolean
  block_reason: string | null
  order_id: string | null
  value_egp: string | null
  listing_ref: string | null
  buy_request_ref: string | null
  credit_status: 'active' | 'exhausted' | 'expired' | 'voided' | null
  reduction_egp: string | null
}

export interface QueueMedia { media_id: string, kind: 'photo' | 'video' | 'invoice' | 'stone_certificate' }

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
  views: number
  requests: number
  media: QueueMedia[]
  guide: { kind: 'making_charge' | 'none', value_pct: number | null, tone: 'ok' | 'bad' | 'none' }
}

export interface QueueMeta { min_list_age_days: number, require_approval: boolean }

export interface CostPanel {
  month: string
  pieces_bought: number
  commission_given_up_egp: string
  spread_given_up_egp: string
  total_cost_egp: string
  not_recorded: number
}

// What the New-code form sends (Backend contracts/staff-promo-api.md §2); absent = not sent.
export interface NewCodeInput {
  code: string
  // Sent for a seller or buyer code by product; a dealer code leaves them out.
  kind?: 'buyer'
  side?: 'seller' | 'buyer'
  product_type?: ProductType
  commission_amount_egp?: string
  deposit_percent?: string
  deposit_amount_egp?: string
  price_percent?: string
  price_amount_egp?: string
  discount_funded_by?: 'commission' | 'spread'
  audience: 'account' | 'anyone'
  tied_to?: string
  use_limit: UseLimit
  commission_mode?: CommissionMode
  commission_percent?: string
  gives_spread?: boolean
  min_listed_days?: string
  requires_approval?: boolean
  monthly_cap_egp?: string
  starts_on?: string
  ends_on?: string
  first_sale_only: boolean
  pays_advance: boolean
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
    queryFn: async () => (await http.get<{ data: QueueRow[], meta: QueueMeta }>('/dashboard/market-maker/queue')).data,
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
    mutationFn: async (input: { body: NewCodeInput, idempotencyKey: string }) =>
      (await http.post('/dashboard/promo-codes', input.body, keyHeader(input.idempotencyKey))).data,
    onSuccess: refresh,
  })
}

export function useUpdatePromoCode () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: { code: string, active?: boolean, monthlyCap?: string | null, endsOn?: string | null, idempotencyKey: string }) =>
      (await http.patch(`/dashboard/promo-codes/${encodeURIComponent(input.code)}`, {
        active: input.active,
        monthly_cap_egp: input.monthlyCap,
        ends_on: input.endsOn,
      }, keyHeader(input.idempotencyKey))).data,
    onSuccess: refresh,
  })
}

// Every term of a code nobody has used yet (PUT; the name stays). A used code answers promo_code_in_use.
export function useReplacePromoCode () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: { code: string, body: Omit<NewCodeInput, 'code'>, idempotencyKey: string }) =>
      (await http.put(`/dashboard/promo-codes/${encodeURIComponent(input.code)}`, input.body, keyHeader(input.idempotencyKey))).data,
    onSuccess: refresh,
  })
}

// A code nobody has used yet; a used one answers promo_code_in_use (turn it off instead).
export function useDeletePromoCode () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: async (input: { code: string, idempotencyKey: string }) =>
      (await http.delete(`/dashboard/promo-codes/${encodeURIComponent(input.code)}`, keyHeader(input.idempotencyKey))).data,
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

// "Leave" changes nothing about the piece; it is only logged (Backend spec 023 D23-7).
export function useLeavePiece () {
  return useMutation({
    mutationFn: async (input: { listingId: string, note?: string, idempotencyKey: string }) =>
      (await http.post(`/dashboard/market-maker/queue/${input.listingId}/leave`, { note: input.note }, keyHeader(input.idempotencyKey))).data,
  })
}
