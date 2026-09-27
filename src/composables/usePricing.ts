import type { Adjustment, PriceInput } from '@/types/pricing'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { pricingService } from '@/services/pricing.service'
import { retryTransient } from './queryRetry'

export const pricingKeys = {
  all: ['pricing'] as const,
  current: () => [...pricingKeys.all, 'current'] as const,
  history: () => [...pricingKeys.all, 'history'] as const,
  adjustmentHistory: () => [...pricingKeys.all, 'adjustment-history'] as const,
  settings: () => [...pricingKeys.all, 'settings'] as const,
  settingHistory: () => [...pricingKeys.all, 'setting-history'] as const,
}

export function useCurrentPricesQuery (enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: pricingKeys.current(),
    queryFn: () => pricingService.current(),
    enabled: computed(() => toValue(enabled)),
    // The feed can change the price every minute.
    refetchInterval: 60_000,
    retry: retryTransient,
  })
}

export function usePriceHistoryQuery () {
  return useQuery({ queryKey: pricingKeys.history(), queryFn: () => pricingService.history(10), retry: retryTransient })
}

export function useAdjustmentHistoryQuery () {
  return useQuery({ queryKey: pricingKeys.adjustmentHistory(), queryFn: () => pricingService.adjustmentHistory(10), retry: retryTransient })
}

export function useSettingsQuery () {
  return useQuery({ queryKey: pricingKeys.settings(), queryFn: () => pricingService.settings(), retry: retryTransient })
}

export function useSettingHistoryQuery () {
  return useQuery({ queryKey: pricingKeys.settingHistory(), queryFn: () => pricingService.settingHistory(10), retry: retryTransient })
}

// Any pricing change can move every karat's prices and the histories.
function useRefreshPricing () {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: pricingKeys.all })
  }
}

export function usePreviewPrices () {
  return useMutation({
    mutationFn: (input: { price: PriceInput | null, adjustments?: Record<number, { buy?: Adjustment, sell?: Adjustment }> }) =>
      pricingService.preview(input.price, input.adjustments),
  })
}

export function useEnterManualPrice () {
  const refresh = useRefreshPricing()
  return useMutation({
    mutationFn: (input: { price: PriceInput, reason: string }) => pricingService.enterManual(input.price, input.reason),
    onSuccess: refresh,
  })
}

export function useConfirmManualPrice () {
  const refresh = useRefreshPricing()
  return useMutation({
    mutationFn: (id: number) => pricingService.confirmManual(id),
    onSuccess: refresh,
    onError: refresh,
  })
}

export function useUpdateAdjustments () {
  const refresh = useRefreshPricing()
  return useMutation({
    mutationFn: (input: { code: number, buy: Adjustment, sell: Adjustment, reason: string }) =>
      pricingService.updateAdjustments(input.code, input.buy, input.sell, input.reason),
    onSuccess: refresh,
  })
}

export function useUpdateSettings () {
  const refresh = useRefreshPricing()
  return useMutation({
    // Several fields saved together share one reason; each is its own audited change.
    mutationFn: async (input: { changes: Array<{ key: string, value: string | boolean }>, reason: string }) => {
      for (const change of input.changes) {
        await pricingService.updateSetting(change.key, change.value, input.reason)
      }
    },
    onSettled: refresh,
  })
}
