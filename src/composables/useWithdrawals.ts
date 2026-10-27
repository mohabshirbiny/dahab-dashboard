import type { PayoutAccountState, PayoutRefusalReason, Withdrawal, WithdrawalListQuery } from '@/types/withdrawal'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { type WithdrawalAction, withdrawalService } from '@/services/withdrawal.service'
import { retryTransient } from './queryRetry'
import { walletKeys } from './useWallet'

export const withdrawalKeys = {
  all: ['withdrawals'] as const,
  list: (query: WithdrawalListQuery) => [...withdrawalKeys.all, 'list', query] as const,
  // Under 'list', so every action that refreshes the lists refreshes the badge too.
  one: (id: string) => [...withdrawalKeys.all, 'one', id] as const,
  accounts: (state: PayoutAccountState, q: string) => [...withdrawalKeys.all, 'accounts', state, q] as const,
}

// Oldest first; "Load more" follows the Backend's cursor.
export function useWithdrawalsQuery (query: MaybeRefOrGetter<WithdrawalListQuery>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => withdrawalKeys.list({ ...toValue(query) })),
    queryFn: ({ pageParam }) => withdrawalService.list(toValue(query), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useWithdrawalQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => withdrawalKeys.one(toValue(id) ?? '')),
    queryFn: () => withdrawalService.show(toValue(id)!),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

// After any action: the withdrawal, the lists and — money moves on release and reject — every wallet figure.
export function useWithdrawalAction () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string, action: WithdrawalAction, idempotencyKey: string }) =>
      withdrawalService.act(input.id, input.action, input.idempotencyKey),
    onSuccess: (withdrawal: Withdrawal) => {
      queryClient.setQueryData(withdrawalKeys.one(withdrawal.id), withdrawal)
      queryClient.invalidateQueries({ queryKey: [...withdrawalKeys.all, 'list'] })
      queryClient.invalidateQueries({ queryKey: walletKeys.all })
    },
  })
}

export function useExportWithdrawals () {
  return useMutation({
    mutationFn: async (query: WithdrawalListQuery) => {
      const result = await withdrawalService.exportCsv(query)
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      link.click()
      URL.revokeObjectURL(url)
      return result
    },
  })
}

export function usePayoutAccountsQuery (state: MaybeRefOrGetter<PayoutAccountState>, q: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => withdrawalKeys.accounts(toValue(state), toValue(q))),
    queryFn: ({ pageParam }) => withdrawalService.payoutAccounts(toValue(state), toValue(q), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

// Verify or refuse: refresh the accounts, the queue, the customer files and the wallets
// (a verification may cancel open withdrawals when it becomes the account in use).
function useRefreshAfterAccount () {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.all })
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    queryClient.invalidateQueries({ queryKey: walletKeys.all })
  }
}

export function useVerifyPayoutAccount () {
  const refresh = useRefreshAfterAccount()
  return useMutation({
    mutationFn: (input: { id: string, idempotencyKey: string }) => withdrawalService.verifyAccount(input.id, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useRefusePayoutAccount () {
  const refresh = useRefreshAfterAccount()
  return useMutation({
    mutationFn: (input: { id: string, reason: PayoutRefusalReason, note: string, idempotencyKey: string }) =>
      withdrawalService.refuseAccount(input.id, input.reason, input.note, input.idempotencyKey),
    onSuccess: refresh,
  })
}
