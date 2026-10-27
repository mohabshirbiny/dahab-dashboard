import type { App } from 'vue'
import { MutationCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { navCountsKey } from '@/composables/useOverview'

export const queryClient: QueryClient = new QueryClient({
  // The sidebar badges come from one request (GET /dashboard/nav-counts); any staff action
  // may change one of its counts, so every successful mutation refreshes it.
  mutationCache: new MutationCache({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: navCountsKey }),
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function installVueQuery (app: App) {
  app.use(VueQueryPlugin, { queryClient })
}
