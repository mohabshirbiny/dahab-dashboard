<template>
  <Panel class="d-pw" subtitle="Figures to read, not verdicts: nobody is suspended or alerted from here" title="People to watch">
    <div class="d-pw__tools">
      <FilterChips v-model="period" :options="PERIODS" />
      <DBtn :loading="exporting" @click="onExport">Export CSV</DBtn>
    </div>

    <LoadingState v-if="query.isPending.value" label="Loading…" />
    <ErrorState v-else-if="query.isError.value" :message="accessErrorMessage(query.error.value)" title="Could not load" @retry="query.refetch()" />

    <EmptyState
      v-else-if="rows.length === 0"
      :description="`Nobody has ${query.data.value?.meta.threshold ?? '…'} or more transactions in this period.`"
      title="Nobody to show"
    />

    <DataTable v-else>
      <template #head>
        <th>Customer</th>
        <th class="r">Sold / bought</th>
        <th class="r">Weight under</th>
        <th class="r">Accepted, never paid</th>
        <th>Most frequent counterparty</th>
        <th class="r">Sent back</th>
      </template>

      <tr v-for="r in rows" :key="r.customer_id">
        <td>{{ r.full_name }} <div class="who2">{{ r.display_ref }}</div></td>
        <td class="r">{{ r.sold }} / {{ r.bought }}</td>

        <td class="r">
          {{ r.weight_under.n }} of {{ r.weight_under.of }}
          <div v-if="r.weight_under.n > 0" class="who2">−{{ r.weight_under.average_pct.replace('-', '') }}% on average</div>
        </td>

        <td class="r">{{ r.not_paid.n }} of {{ r.not_paid.of }}</td>

        <td>
          <template v-if="r.same_counterparty">{{ r.same_counterparty.full_name }} ({{ r.same_counterparty.count }})</template>
          <template v-else>None</template>
        </td>

        <td class="r">{{ r.sent_back.n }} of {{ r.sent_back.of }}</td>
      </tr>
    </DataTable>
  </Panel>
</template>

<script lang="ts" setup>
  import { useMutation, useQuery } from '@tanstack/vue-query'
  import { computed, ref } from 'vue'
  import { http } from '@/api/axios'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { retryTransient } from '@/composables/queryRetry'

  // People to watch (Backend spec 019 US8, people_to_watch.view): only rendered for people who may
  // read it. Read-only; the Backend audits each read and export.
  interface Row {
    customer_id: string
    display_ref: string | null
    full_name: string | null
    sold: number
    bought: number
    weight_under: { n: number, of: number, average_pct: string }
    not_paid: { n: number, of: number }
    same_counterparty: { count: number, display_ref: string | null, full_name: string | null } | null
    sent_back: { n: number, of: number }
  }

  const PERIODS = [
    { value: '30', label: '30 days' },
    { value: '60', label: '60 days' },
    { value: '90', label: '90 days' },
    { value: 'year', label: 'This year' },
  ]
  const period = ref('30')

  function range () {
    const to = new Date()
    const from = new Date()
    if (period.value === 'year') {
      from.setMonth(0, 1)
    } else {
      from.setDate(from.getDate() - Number(period.value))
    }
    const day = (d: Date) => d.toISOString().slice(0, 10)
    return { from: day(from), to: day(to) }
  }

  const query = useQuery({
    queryKey: computed(() => ['people-to-watch', period.value]),
    queryFn: async () => (await http.get<{ data: Row[], meta: { threshold: number } }>('/dashboard/people-to-watch', { params: range() })).data,
    retry: retryTransient,
  })
  const rows = computed(() => query.data.value?.data ?? [])

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await http.get<Blob>('/dashboard/people-to-watch/export', { params: range(), responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `people-to-watch-${period.value}.csv`
      link.click()
      URL.revokeObjectURL(url)
    },
  })
  const exporting = computed(() => exportMutation.isPending.value)
  const onExport = () => exportMutation.mutate()
</script>

<style lang="scss" scoped>
.d-pw { margin-top: 24px; }
.d-pw__tools { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 10px 16px; }
</style>
