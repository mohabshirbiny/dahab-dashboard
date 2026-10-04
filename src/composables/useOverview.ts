import { useQuery } from '@tanstack/vue-query'
import { getOverview } from '@/services/overview.service'
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
