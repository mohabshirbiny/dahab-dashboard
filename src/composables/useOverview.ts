import { useQuery } from '@tanstack/vue-query'
import { getOverview } from '@/services/overview.service'

export function useOverviewQuery () {
  return useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
  })
}
