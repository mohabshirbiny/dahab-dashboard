<template>
  <Panel :subtitle="subtitle" title="New devices waiting for approval">
    <LoadingState v-if="approvals.isPending.value" label="Loading requests…" />

    <ErrorState
      v-else-if="approvals.isError.value"
      :message="securityErrorMessage(approvals.error.value)"
      title="Could not load the requests"
      @retry="approvals.refetch()"
    />

    <EmptyState
      v-else-if="rows.length === 0"
      description="A founder signing in from a new device appears here for the other founder to approve. Requests end after 15 minutes."
      title="Nothing waiting"
    />

    <DataTable v-else>
      <template #head>
        <th>Founder</th>
        <th>Device</th>
        <th>Where from</th>
        <th>Asked</th>
        <th>Ends</th>
        <th class="r" />
      </template>

      <tr v-for="row in rows" :key="row.id">
        <td>
          <b>{{ row.founder.name }}</b>
          <div v-if="!row.canDecide" class="who2">Your own request: the other founder decides</div>
        </td>

        <td>
          <span class="mono">{{ formatDeviceRef(row.deviceRef) }}</span>
          <div class="who2">{{ row.platform ?? 'web' }}<template v-if="row.userAgent"> · {{ shortAgent(row.userAgent) }}</template></div>
        </td>

        <td class="mono">{{ row.ipAddress ?? '—' }}</td>
        <td class="nowrap">{{ formatRelativeTime(row.requestedAt) }}</td>
        <td class="nowrap mono">{{ formatDateTime(row.expiresAt) }}</td>

        <td class="r nowrap">
          <template v-if="row.canDecide">
            <DBtn @click="open(row, 'refuse')">Refuse</DBtn>
            <DBtn class="d-pa__approve" kind="primary" @click="open(row, 'approve')">Approve</DBtn>
          </template>
        </td>
      </tr>
    </DataTable>

    <template #footer>
      <NoteBanner variant="info">
        Approve only when you have spoken to the other founder and they are signing in right now. A refusal does not freeze anything;
        if you think their account is being misused, freeze it below.
      </NoteBanner>
    </template>

    <DecideDeviceModal
      :approval="deciding"
      :decision="decision"
      :open="deciding !== null"
      @close="deciding = null"
      @decided="onDecided"
    />
  </Panel>
</template>

<script lang="ts" setup>
  import type { DeviceApproval } from '@/types/security'
  import { computed, ref } from 'vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDateTime, formatRelativeTime } from '@/composables/useFormatters'
  import { useDeviceApprovalsQuery } from '@/composables/useSecurity'
  import DecideDeviceModal from './DecideDeviceModal.vue'
  import { formatDeviceRef, securityErrorMessage } from './securityErrors'

  // Backend spec 021 Story 1: every founder's pending requests; Approve / Refuse on the other
  // founder's (`can_decide`). Refetched every 15 seconds.
  const emit = defineEmits<{ (e: 'refused', approval: DeviceApproval): void }>()

  const approvals = useDeviceApprovalsQuery('pending')
  const rows = computed(() => approvals.data.value?.rows ?? [])
  const subtitle = computed(() => {
    const mine = approvals.data.value?.pendingForMe ?? 0
    return mine === 0 ? 'None for you to decide' : `${mine} for you to decide`
  })

  const deciding = ref<DeviceApproval | null>(null)
  const decision = ref<'approve' | 'refuse'>('approve')

  function open (row: DeviceApproval, which: 'approve' | 'refuse') {
    decision.value = which
    deciding.value = row
  }

  function onDecided (row: DeviceApproval) {
    if (row.status === 'refused') emit('refused', row)
  }

  function shortAgent (agent: string): string {
    return agent.length > 48 ? `${agent.slice(0, 48)}…` : agent
  }
</script>

<style lang="scss" scoped>
.d-pa__approve { margin-left: 6px; }
</style>
