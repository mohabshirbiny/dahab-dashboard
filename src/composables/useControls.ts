import type { ControlCategory, ControlLevel, SetControlInput, VisibilityKey } from '@/types/controls'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { controlsService } from '@/services/controls.service'
import { retryTransient } from './queryRetry'

export const controlsKeys = {
  all: ['controls'] as const,
  list: () => [...controlsKeys.all, 'list'] as const,
  banner: () => [...controlsKeys.all, 'banner'] as const,
}

export function useSwitchesQuery () {
  return useQuery({
    queryKey: controlsKeys.list(),
    queryFn: () => controlsService.list(),
    retry: retryTransient,
  })
}

// The banner on every page: public, so it works before the permission set is known.
export function useStoppedBanner () {
  return useQuery({
    queryKey: controlsKeys.banner(),
    queryFn: () => controlsService.stopped(),
    refetchInterval: 60_000,
    retry: false,
  })
}

function useRefresh () {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: controlsKeys.all })
}

export function useSetControl () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { values: SetControlInput, idempotencyKey: string }) => controlsService.set(input.values, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useClearControl () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { level: ControlLevel, category: ControlCategory | null, idempotencyKey: string }) =>
      controlsService.clear(input.level, input.category, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useSetVisibility () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { key: VisibilityKey, shown: boolean, idempotencyKey: string }) =>
      controlsService.setVisibility(input.key, input.shown, input.idempotencyKey),
    onSuccess: refresh,
  })
}
