import type { PublishLegalInput } from '@/types/legal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { legalService } from '@/services/legal.service'
import { retryTransient } from './queryRetry'

export const legalKeys = {
  all: ['legal'] as const,
  documents: () => [...legalKeys.all, 'documents'] as const,
  versions: (code: string | null, withBody: boolean) => [...legalKeys.all, 'versions', code, withBody] as const,
}

export function useLegalDocumentsQuery () {
  return useQuery({
    queryKey: legalKeys.documents(),
    queryFn: () => legalService.documents(),
    retry: retryTransient,
  })
}

export function useLegalVersionsQuery (code: MaybeRefOrGetter<string | null>, withBody: MaybeRefOrGetter<boolean> = false) {
  return useQuery({
    queryKey: computed(() => legalKeys.versions(toValue(code), toValue(withBody))),
    queryFn: () => legalService.versions(toValue(code) as string, toValue(withBody)),
    enabled: computed(() => toValue(code) !== null),
    retry: retryTransient,
  })
}

export function usePublishLegalVersion () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: PublishLegalInput, idempotencyKey: string }) => legalService.publish(input.values, input.idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: legalKeys.all }),
  })
}
