import { overviewMock } from '@/mock/overview'
import type { OverviewData } from '@/types/overview'

// When a real API is available, this becomes:
//   const { data } = await http.get<OverviewData>(endpoints.overview)
//   return data
export async function getOverview (): Promise<OverviewData> {
  await new Promise(resolve => setTimeout(resolve, 200))
  return overviewMock
}
