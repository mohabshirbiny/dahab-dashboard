import type { StatementQuery } from '@/types/wallet'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { walletService } from '@/services/wallet.service'
import { retryTransient } from './queryRetry'

export const walletKeys = {
  all: ['wallet'] as const,
  overview: () => [...walletKeys.all, 'overview'] as const,
  customer: (id: string) => [...walletKeys.all, 'customer', id] as const,
  statement: (query: StatementQuery) => [...walletKeys.all, 'statement', query] as const,
}

// Callers pass `enabled` from the viewer's wallet.view permission, so staff
// without it never send the request.
export function useWalletOverviewQuery (enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: walletKeys.overview(),
    queryFn: () => walletService.overview(),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useCustomerWalletQuery (id: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => walletKeys.customer(toValue(id))),
    queryFn: () => walletService.customerWallet(toValue(id)),
    enabled: computed(() => toValue(enabled) && toValue(id) !== ''),
    retry: retryTransient,
  })
}

// Newest first; "Load more" follows the Backend's cursor.
export function useWalletStatementQuery (query: MaybeRefOrGetter<StatementQuery | null>) {
  return useInfiniteQuery({
    queryKey: computed(() => walletKeys.statement({ ...(toValue(query) ?? ({} as StatementQuery)) })),
    queryFn: ({ pageParam }) => walletService.statement(toValue(query)!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(query) !== null),
    retry: retryTransient,
  })
}

export function useExportWalletStatement () {
  return useMutation({
    mutationFn: async (query: StatementQuery) => {
      const result = await walletService.exportCsv(query)
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
