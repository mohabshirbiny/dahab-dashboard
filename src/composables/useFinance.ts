import type { AdjustmentDirection, BankMovementKind, CompensationQuery, ExportResult, PayCompensationInput, RecordBankMovementInput } from '@/types/finance'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { financeService } from '@/services/finance.service'
import { retryTransient } from './queryRetry'
import { walletKeys } from './useWallet'

export const financeKeys = {
  all: ['finance'] as const,
  compensation: (query: CompensationQuery) => [...financeKeys.all, 'compensation', query] as const,
  movements: (from: string, to: string, kind: string) => [...financeKeys.all, 'movements', from, to, kind] as const,
  book: (from: string, to: string) => [...financeKeys.all, 'book', from, to] as const,
  day: (date: string | null) => [...financeKeys.all, 'day', date ?? 'today'] as const,
  closes: (from: string, to: string) => [...financeKeys.all, 'closes', from, to] as const,
  adjustments: (customerId: string | null) => [...financeKeys.all, 'adjustments', customerId ?? 'all'] as const,
  compensationOrders: (customerId: string) => [...financeKeys.all, 'compensation-orders', customerId] as const,
}

// Save a CSV the Backend made (it records each export).
export function download (result: ExportResult): ExportResult {
  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  link.click()
  URL.revokeObjectURL(url)
  return result
}

// Every money action changes the wallets, the bank and the closing figures.
function useRefreshMoney () {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: financeKeys.all })
    queryClient.invalidateQueries({ queryKey: walletKeys.all })
    queryClient.invalidateQueries({ queryKey: ['overview'] })
  }
}

export function useCompensationQuery (query: MaybeRefOrGetter<CompensationQuery>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useInfiniteQuery({
    queryKey: computed(() => financeKeys.compensation({ ...toValue(query) })),
    queryFn: ({ pageParam }) => financeService.compensation(toValue(query), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

// The customer's orders, for the order a compensation names.
export function useCompensationOrdersQuery (customerId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => financeKeys.compensationOrders(toValue(customerId))),
    queryFn: () => financeService.compensationOrders(toValue(customerId)),
    enabled: computed(() => toValue(customerId) !== ''),
    retry: retryTransient,
  })
}

export function usePayCompensation () {
  const refresh = useRefreshMoney()
  return useMutation({
    mutationFn: (input: { body: PayCompensationInput, idempotencyKey: string }) => financeService.payCompensation(input.body, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useExportCompensation () {
  return useMutation({ mutationFn: async (query: CompensationQuery) => download(await financeService.exportCompensation(query)) })
}

export function useAdjustWallet () {
  const refresh = useRefreshMoney()
  return useMutation({
    mutationFn: (input: { customerId: string, direction: AdjustmentDirection, amount: string, reason: string, idempotencyKey: string }) =>
      financeService.adjustWallet(input.customerId, input.direction, input.amount, input.reason, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useAdjustmentsQuery (customerId: MaybeRefOrGetter<string | null>, enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => financeKeys.adjustments(toValue(customerId))),
    queryFn: () => financeService.adjustments(toValue(customerId)),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useRecordMovement () {
  const refresh = useRefreshMoney()
  return useMutation({
    mutationFn: async (input: { body: Omit<RecordBankMovementInput, 'proofUploadToken'>, proof: File | null, idempotencyKey: string }) => {
      const token = input.proof ? await financeService.uploadProof(input.proof) : null
      return financeService.recordMovement({ ...input.body, proofUploadToken: token }, input.idempotencyKey)
    },
    onSuccess: refresh,
  })
}

export function useMovementsQuery (from: MaybeRefOrGetter<string>, to: MaybeRefOrGetter<string>, kind: MaybeRefOrGetter<BankMovementKind | ''>, enabled: MaybeRefOrGetter<boolean>) {
  return useInfiniteQuery({
    queryKey: computed(() => financeKeys.movements(toValue(from), toValue(to), toValue(kind))),
    queryFn: ({ pageParam }) => financeService.movements(toValue(from), toValue(to), toValue(kind), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useExportMovements () {
  return useMutation({ mutationFn: async (input: { from: string, to: string, kind: BankMovementKind | '' }) => download(await financeService.exportMovements(input.from, input.to, input.kind)) })
}

export function useBankBookQuery (from: MaybeRefOrGetter<string>, to: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return useInfiniteQuery({
    queryKey: computed(() => financeKeys.book(toValue(from), toValue(to))),
    queryFn: ({ pageParam }) => financeService.bankBook(toValue(from), toValue(to), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useExportBankBook () {
  return useMutation({ mutationFn: async (input: { from: string, to: string }) => download(await financeService.exportBankBook(input.from, input.to)) })
}

export function useCloseDayQuery (date: MaybeRefOrGetter<string | null>, enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => financeKeys.day(toValue(date))),
    queryFn: () => financeService.day(toValue(date)),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useRecentClosesQuery (from: MaybeRefOrGetter<string>, to: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>) {
  return useQuery({
    queryKey: computed(() => financeKeys.closes(toValue(from), toValue(to))),
    queryFn: () => financeService.recentCloses(toValue(from), toValue(to)),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useCloseDay () {
  const refresh = useRefreshMoney()
  return useMutation({
    mutationFn: (input: { date: string, bankBalance: string, explanation: string | null, idempotencyKey: string }) =>
      financeService.closeDay(input.date, input.bankBalance, input.explanation, input.idempotencyKey),
    onSuccess: refresh,
  })
}
