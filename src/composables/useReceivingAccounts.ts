import type { ReceivingAccountInput, TopUpMethod } from '@/types/topup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { topUpService } from '@/services/topup.service'
import { retryTransient } from './queryRetry'

export const receivingAccountKeys = {
  all: ['receiving-accounts'] as const,
  list: (includeInactive: boolean) => [...receivingAccountKeys.all, includeInactive] as const,
}

// Readable with topup.match or topup.accounts.manage; callers pass `enabled`.
export function useReceivingAccountsQuery (includeInactive: MaybeRefOrGetter<boolean>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: computed(() => receivingAccountKeys.list(toValue(includeInactive))),
    queryFn: () => topUpService.receivingAccounts(toValue(includeInactive)),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

// Create, or update when an id is given (the method is fixed at creation).
export function useSaveReceivingAccount () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: number | null, method: TopUpMethod, values: ReceivingAccountInput }) =>
      input.id === null
        ? topUpService.createAccount(input.method, input.values)
        : topUpService.updateAccount(input.id, input.values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: receivingAccountKeys.all }),
  })
}

export function useSetReceivingAccountActive () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: number, isActive: boolean }) => topUpService.updateAccount(input.id, { isActive: input.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: receivingAccountKeys.all }),
  })
}
