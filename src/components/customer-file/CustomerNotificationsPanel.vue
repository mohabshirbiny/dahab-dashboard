<template>
  <Panel subtitle="As their inbox shows it. Codes and confirmation links never appear here." title="What they were sent">
    <LoadingState v-if="query.isPending.value" label="Loading messages…" />

    <ErrorState
      v-else-if="query.isError.value"
      message="The messages could not be loaded. Check your connection and try again."
      title="Could not load the messages"
      @retry="query.refetch()"
    />

    <template v-else>
      <EmptyState v-if="items.length === 0" description="Nothing has been sent to this customer's inbox yet." title="No messages" />

      <DataTable v-else>
        <template #head>
          <th>Sent</th>
          <th>Message</th>
          <th>Read</th>
        </template>

        <tr v-for="n in items" :key="n.id">
          <td class="nowrap">{{ formatDateTime(n.createdAt) }}</td>

          <td>
            <strong>{{ n.title }}</strong>
            <div class="who2">{{ n.body }}</div>
          </td>

          <td class="nowrap">{{ n.readAt ? formatDateTime(n.readAt) : 'Not yet' }}</td>
        </tr>
      </DataTable>

      <div v-if="query.hasNextPage.value" class="d-cnp__more">
        <DBtn :loading="query.isFetchingNextPage.value" @click="query.fetchNextPage()">Load more</DBtn>
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
  import { useCustomerNotificationsQuery } from '@/composables/useCustomerFile'
  import { formatDateTime } from '@/composables/useFormatters'

  // Backend spec 017 FR-035: read-only, customer.view.
  const props = defineProps<{ customerId: string }>()

  const query = useCustomerNotificationsQuery(() => props.customerId)
  const items = computed(() => query.data.value?.pages.flatMap(p => p.items) ?? [])
</script>

<style lang="scss" scoped>
.d-cnp__more { display: flex; justify-content: center; padding: 12px; }
</style>
