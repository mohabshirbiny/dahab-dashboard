import type { CreateFaqInput, RevertTarget, SaveDraftInput, TextListQuery } from '@/types/content'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { contentService } from '@/services/content.service'
import { retryTransient } from './queryRetry'

export const contentKeys = {
  all: ['content'] as const,
  list: (query: TextListQuery) => [...contentKeys.all, 'list', query] as const,
  drafts: () => [...contentKeys.all, 'drafts'] as const,
  history: (key: string | null) => [...contentKeys.all, 'history', key] as const,
  placeholders: () => [...contentKeys.all, 'placeholders'] as const,
}

// Save a file the Backend made (it records each export).
function save (blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function useTextsQuery (query: MaybeRefOrGetter<TextListQuery>) {
  return useInfiniteQuery({
    queryKey: computed(() => contentKeys.list({ ...toValue(query) })),
    queryFn: ({ pageParam }) => contentService.list(toValue(query), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    retry: retryTransient,
  })
}

// Every pending draft, whatever the page is filtered to: what Publish changes would put live.
export function useDraftsQuery () {
  return useQuery({
    queryKey: contentKeys.drafts(),
    queryFn: () => contentService.list({ kind: '', area: '', q: '', state: 'draft' }, null, 200),
    retry: retryTransient,
  })
}

export function useTextHistoryQuery (key: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => contentKeys.history(toValue(key))),
    queryFn: () => contentService.history(toValue(key) as string),
    enabled: computed(() => toValue(key) !== null),
    retry: retryTransient,
  })
}

export function usePlaceholdersQuery () {
  return useQuery({
    queryKey: contentKeys.placeholders(),
    queryFn: () => contentService.placeholders(),
    retry: retryTransient,
    staleTime: 60_000,
  })
}

function useRefresh () {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: contentKeys.all })
}

export function useSaveTextDraft () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { values: SaveDraftInput, idempotencyKey: string }) => contentService.saveDraft(input.values, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useDiscardTextDraft () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { key: string, idempotencyKey: string }) => contentService.discardDraft(input.key, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useRevertText () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { key: string, to: RevertTarget, idempotencyKey: string }) => contentService.revert(input.key, input.to, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function usePublishTexts () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (idempotencyKey: string) => contentService.publish(idempotencyKey),
    onSuccess: refresh,
  })
}

export function useCreateFaqEntry () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { values: CreateFaqInput, idempotencyKey: string }) => contentService.createFaq(input.values, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useMoveFaqEntry () {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (input: { slug: string, position: number, idempotencyKey: string }) => contentService.moveFaq(input.slug, input.position, input.idempotencyKey),
    onSuccess: refresh,
  })
}

export function useExportTexts () {
  return useMutation({
    mutationFn: async (query: TextListQuery) => {
      const result = await contentService.exportCsv(query)
      save(result.blob, result.filename)
      return result
    },
  })
}
