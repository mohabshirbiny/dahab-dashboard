import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { noticesService } from '@/services/notices.service'

// Dashboard notices, the bell (Backend spec 021). Every signed-in staff member; own notices only.
export const noticeKeys = {
  all: ['staff-notices'] as const,
  list: () => [...noticeKeys.all, 'list'] as const,
}

// The latest notices and the unread count, refreshed every 30 seconds.
export function useNoticesQuery (enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: noticeKeys.list(),
    queryFn: () => noticesService.list(false, 1),
    enabled: computed(() => toValue(enabled)),
    refetchInterval: 30_000,
    retry: false,
  })
}

export function useMarkNoticeRead () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => noticesService.markRead(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noticeKeys.all }),
  })
}

export function useMarkAllNoticesRead () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => noticesService.markAllRead(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noticeKeys.all }),
  })
}
