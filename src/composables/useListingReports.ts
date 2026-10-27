import type { ListingReport, ReportState } from '@/types/listingReport'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { listingReportService } from '@/services/listingReport.service'
import { retryTransient } from './queryRetry'
import { listingKeys } from './useListings'

export const listingReportKeys = {
  all: ['listing-reports'] as const,
  list: (state: ReportState | null) => [...listingReportKeys.all, 'list', state ?? 'all'] as const,
  one: (id: string) => [...listingReportKeys.all, 'one', id] as const,
}

export function useListingReportsQuery (state: MaybeRefOrGetter<ReportState | null>, enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: computed(() => listingReportKeys.list(toValue(state))),
    queryFn: () => listingReportService.list(toValue(state)),
    enabled: computed(() => toValue(enabled)),
    retry: retryTransient,
  })
}

export function useListingReportQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => listingReportKeys.one(toValue(id) ?? '')),
    queryFn: () => listingReportService.show(toValue(id)!),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

// After a dismissal or a take-down: the report, every list and badge, and the listings.
function useRefreshAfterReport () {
  const queryClient = useQueryClient()
  return (report?: ListingReport) => {
    if (report) {
      queryClient.setQueryData(listingReportKeys.one(report.id), report)
    }
    queryClient.invalidateQueries({ queryKey: [...listingReportKeys.all, 'list'] })
    queryClient.invalidateQueries({ queryKey: listingKeys.all })
  }
}

export function useDismissReport () {
  const refresh = useRefreshAfterReport()
  return useMutation({
    mutationFn: (input: { id: string, note: string, idempotencyKey: string }) => listingReportService.dismiss(input.id, input.note, input.idempotencyKey),
    onSuccess: report => refresh(report),
    onError: () => refresh(),
  })
}

export function useTakeDownReported () {
  const refresh = useRefreshAfterReport()
  return useMutation({
    mutationFn: (input: { id: string, reason: string, idempotencyKey: string }) => listingReportService.takeDown(input.id, input.reason, input.idempotencyKey),
    onSuccess: report => refresh(report),
    onError: () => refresh(),
  })
}
