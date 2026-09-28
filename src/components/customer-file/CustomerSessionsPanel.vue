<template>
  <Panel title="Sign-ins and devices">
    <LoadingState v-if="query.isPending.value" label="Loading sign-ins…" />

    <ErrorState
      v-else-if="query.isError.value"
      message="Sign-ins and devices could not be loaded. Check your connection and try again."
      title="Could not load sign-ins"
      @retry="query.refetch()"
    />

    <template v-else-if="data">
      <div class="d-sess__label">Open sessions</div>

      <EmptyState
        v-if="data.sessions.length === 0"
        description="They are not signed in anywhere right now. Past sign-ins and sign-outs are in History."
        title="No open sessions"
      />

      <template v-else>
        <DataTable :class="{ 'd-sess__stale': query.isPlaceholderData.value }">
          <template #head>
            <th>Started</th>
            <th>Last active</th>
            <th>Expires</th>
          </template>

          <tr v-for="session in data.sessions" :key="session.id">
            <td>{{ formatDateTime(session.startedAt) }}</td>
            <td>{{ formatRelativeTime(session.lastActiveAt) }}</td>
            <td>{{ session.expiresAt ? formatDateTime(session.expiresAt) : '—' }}</td>
          </tr>
        </DataTable>

        <Pagination :page="data.page" :page-size="data.pageSize" :total="data.total" @update:page="page = $event" />
      </template>

      <div class="d-sess__label d-sess__label--devices">Devices</div>

      <EmptyState v-if="data.devices.length === 0" description="No device has been recorded for this customer." title="No devices" />

      <DataTable v-else>
        <template #head>
          <th>Device</th>
          <th>First seen</th>
          <th>Last seen</th>
        </template>

        <tr v-for="device in data.devices" :key="device.ref">
          <td class="mono">{{ device.ref }}</td>
          <td>{{ formatDateTime(device.firstSeenAt) }}</td>
          <td>{{ formatDateTime(device.lastSeenAt) }}</td>
        </tr>
      </DataTable>
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Pagination from '@/components/ui/Pagination.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useCustomerSessionsQuery } from '@/composables/useCustomerFile'
  import { formatDateTime, formatRelativeTime } from '@/composables/useFormatters'

  const props = defineProps<{ customerId: string }>()

  const page = ref(1)
  const query = useCustomerSessionsQuery(() => props.customerId, page)
  const data = computed(() => query.data.value)
</script>

<style lang="scss" scoped>
.d-sess__label { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
.d-sess__label--devices { margin-top: 18px; }
.d-sess__stale { opacity: .55; transition: opacity .15s ease; }
</style>
