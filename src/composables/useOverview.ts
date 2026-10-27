import { useQuery } from '@tanstack/vue-query'
import { getNavCounts, getOverview } from '@/services/overview.service'
import { retryTransient } from './queryRetry'

// GET /dashboard/overview (Backend spec 015): sections by permission; refreshed every minute.
export function useOverviewQuery () {
  return useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
    refetchInterval: 60_000,
    retry: retryTransient,
  })
}

// Every successful mutation refreshes this key (plugins/vue-query.ts), so a badge moves
// right after an approve, a match or a release.
export const navCountsKey = ['nav-counts'] as const

// GET /dashboard/nav-counts: every sidebar badge and the Users tabs in one request,
// refreshed every minute. Any staff member; counts they may not see come back null.
export function useNavCountsQuery () {
  return useQuery({
    queryKey: navCountsKey,
    queryFn: getNavCounts,
    refetchInterval: 60_000,
    retry: false,
  })
}
