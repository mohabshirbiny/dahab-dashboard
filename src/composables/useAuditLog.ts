import type { AuditFilters } from '@/types/audit'
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { auditService } from '@/services/audit.service'
import { retryTransient } from './queryRetry'

export const auditKeys = {
  all: ['audit'] as const,
  list: (filters: AuditFilters) => [...auditKeys.all, 'list', filters] as const,
  entry: (id: number) => [...auditKeys.all, 'entry', id] as const,
  categories: () => [...auditKeys.all, 'categories'] as const,
}

// Keyset pages: "Load more" follows the Backend's cursor, so entries written
// meanwhile never shift or repeat a page.
export function useAuditLogQuery (filters: MaybeRefOrGetter<AuditFilters>) {
  return useInfiniteQuery({
    queryKey: computed(() => auditKeys.list({ ...toValue(filters) })),
    queryFn: ({ pageParam }) => auditService.list(toValue(filters), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    retry: retryTransient,
  })
}

export function useAuditEntryQuery (id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => auditKeys.entry(toValue(id) ?? 0)),
    queryFn: () => auditService.entry(toValue(id)!),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

export function useAuditCategoriesQuery () {
  return useQuery({
    queryKey: auditKeys.categories(),
    queryFn: () => auditService.categories(),
    staleTime: 10 * 60 * 1000,
    retry: retryTransient,
  })
}

export function useExportAuditLog () {
  return useMutation({
    mutationFn: async (filters: AuditFilters) => {
      const result = await auditService.exportCsv(filters)
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
