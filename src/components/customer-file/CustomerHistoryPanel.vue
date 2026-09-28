<template>
  <Panel :subtitle="ownOnly ? 'Your own actions only' : undefined" title="History">
    <LoadingState v-if="history.isPending.value" label="Loading the history…" />

    <ErrorState
      v-else-if="history.isError.value"
      message="The history could not be loaded. Check your connection and try again."
      title="Could not load the history"
      @retry="history.refetch()"
    />

    <EmptyState
      v-else-if="entries.length === 0"
      :description="ownOnly ? 'You have not acted on this customer.' : 'Nothing has been recorded for this customer yet.'"
      title="No history"
    />

    <template v-else>
      <DataTable>
        <template #head>
          <th>When</th>
          <th>What</th>
        </template>

        <tr v-for="entry in entries" :key="entry.id">
          <td class="mono d-hist__when">{{ formatDateTime(entry.at) }}</td>

          <td>
            {{ entry.label }}
            <StatusTag v-if="entry.outcome && entry.outcome !== 'success'" :label="entry.outcome" variant="bad" />
            <div class="who2">{{ [actorLabel(entry.actor), entry.subject].filter(Boolean).join(' · ') }}</div>
            <div v-if="entry.reason" class="who2">“{{ entry.reason }}”</div>
          </td>
        </tr>
      </DataTable>

      <div v-if="history.hasNextPage.value" class="d-hist__more">
        <DBtn :loading="history.isFetchingNextPage.value" @click="history.fetchNextPage()">Load more</DBtn>
      </div>
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { useCustomerHistoryQuery } from '@/composables/useCustomerFile'
  import { formatDateTime } from '@/composables/useFormatters'
  import { actorLabel } from '@/types/audit'

  // Shown only to staff with an audit permission; `ownOnly` when it is audit.view_own alone.
  const props = defineProps<{ customerId: string, ownOnly: boolean }>()

  const history = useCustomerHistoryQuery(() => props.customerId, true)
  const entries = computed(() => history.data.value?.pages.flatMap(page => page.entries) ?? [])
</script>

<style lang="scss" scoped>
.d-hist__when { white-space: nowrap; }
.d-hist__more { display: flex; justify-content: center; margin-top: 12px; }
</style>
