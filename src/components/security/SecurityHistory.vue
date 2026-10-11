<template>
  <Panel title="History">
    <template #filters>
      <FilterChips v-model="view" :options="viewOptions" />
    </template>

    <template v-if="view === 'freezes'">
      <LoadingState v-if="freezes.isPending.value" label="Loading…" />
      <ErrorState v-else-if="freezes.isError.value" :message="securityErrorMessage(freezes.error.value)" @retry="freezes.refetch()" />
      <EmptyState v-else-if="freezeRows.length === 0" title="No freeze yet" />

      <DataTable v-else>
        <template #head>
          <th>Frozen</th>
          <th>By</th>
          <th>Reason</th>
          <th>Confirmations</th>
          <th>Unfrozen</th>
        </template>

        <tr v-for="row in freezeRows" :key="row.id">
          <td><b>{{ row.frozenStaff.name }}</b><div class="who2">{{ formatDateTime(row.frozenAt) }}</div></td>
          <td>{{ row.frozenBy.name }}</td>
          <td class="d-sh__text">{{ row.reason }}</td>

          <td>
            <div v-for="c in row.confirmations" :key="c.slot" class="who2">
              {{ c.slot }}. {{ c.by?.name ?? '—' }} ({{ kindLabel(c.kind) }}) · {{ formatDateTime(c.at) }}
            </div>

            <span v-if="row.confirmations.length === 0" class="who2">None yet</span>
          </td>

          <td class="nowrap">{{ row.unfrozenAt ? formatDateTime(row.unfrozenAt) : 'Still frozen' }}</td>
        </tr>
      </DataTable>

      <Pagination
        v-if="(freezes.data.value?.total ?? 0) > PAGE_SIZE"
        v-model:page="freezePage"
        :page-size="PAGE_SIZE"
        :total="freezes.data.value?.total ?? 0"
      />
    </template>

    <template v-else>
      <LoadingState v-if="approvals.isPending.value" label="Loading…" />
      <ErrorState v-else-if="approvals.isError.value" :message="securityErrorMessage(approvals.error.value)" @retry="approvals.refetch()" />
      <EmptyState v-else-if="approvalRows.length === 0" title="No device request yet" />

      <DataTable v-else>
        <template #head>
          <th>Founder</th>
          <th>Device</th>
          <th>Asked</th>
          <th>Outcome</th>
          <th>Note</th>
          <th class="r" />
        </template>

        <tr v-for="row in approvalRows" :key="row.id">
          <td><b>{{ row.founder.name }}</b></td>
          <td class="mono">{{ formatDeviceRef(row.deviceRef) }}<div class="who2">{{ row.ipAddress ?? '' }}</div></td>
          <td class="nowrap">{{ formatDateTime(row.requestedAt) }}</td>

          <td>
            <StatusTag :label="outcomeLabel(row)" :variant="outcomeVariant(row)" />
            <div v-if="row.decidedBy" class="who2">{{ row.decidedBy.name }} · {{ formatDateTime(row.decidedAt) }}</div>
          </td>

          <td class="d-sh__text">{{ row.decisionNote ?? '' }}</td>

          <td class="r">
            <!-- Plan Q3: a refused request offers Freeze, as a separate deliberate action. -->
            <DBtn v-if="canOfferFreeze(row)" kind="danger" @click="emit('freeze', row.founder)">Freeze</DBtn>
          </td>
        </tr>
      </DataTable>

      <Pagination
        v-if="(approvals.data.value?.total ?? 0) > PAGE_SIZE"
        v-model:page="approvalPage"
        :page-size="PAGE_SIZE"
        :total="approvals.data.value?.total ?? 0"
      />
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import type { DeviceApproval, FreezeConfirmation, StaffRefLite } from '@/types/security'
  import type { StatusVariant } from '@/types/status'
  import { computed, ref } from 'vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Pagination from '@/components/ui/Pagination.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useDeviceApprovalsQuery, useFreezesQuery } from '@/composables/useSecurity'
  import { useAuthStore } from '@/stores/auth'
  import { formatDeviceRef, securityErrorMessage } from './securityErrors'

  // Backend spec 021: every freeze and (founders only) every device request, newest first.
  const emit = defineEmits<{ (e: 'freeze', target: StaffRefLite): void }>()

  const PAGE_SIZE = 20
  const auth = useAuthStore()
  const isFounder = computed(() => Boolean(auth.user?.isFounder))

  const view = ref<'freezes' | 'devices'>('freezes')
  const viewOptions = computed(() => isFounder.value
    ? [{ value: 'freezes' as const, label: 'Freezes' }, { value: 'devices' as const, label: 'Device requests' }]
    : [{ value: 'freezes' as const, label: 'Freezes' }])

  const freezePage = ref(1)
  const approvalPage = ref(1)
  const freezes = useFreezesQuery('all', freezePage)
  const approvals = useDeviceApprovalsQuery('all', approvalPage, () => isFounder.value && view.value === 'devices')
  const openFreezes = useFreezesQuery('open')

  const freezeRows = computed(() => freezes.data.value?.rows ?? [])
  const approvalRows = computed(() => approvals.data.value?.rows ?? [])

  function kindLabel (kind: FreezeConfirmation['kind']): string {
    return kind === 'frozen_founder' ? 'the frozen founder' : (kind === 'second_approver' ? 'the stand-in' : 'founder')
  }

  function outcomeLabel (row: DeviceApproval): string {
    if (row.status === 'approved') return row.collectedAt ? 'Approved, signed in' : 'Approved'
    if (row.status === 'refused') return 'Refused'
    if (row.status === 'expired') return 'Ended'
    return 'Waiting'
  }

  function outcomeVariant (row: DeviceApproval): StatusVariant {
    switch (row.status) {
      case 'approved': {
        return 'ok'
      }
      case 'refused': {
        return 'bad'
      }
      case 'expired': {
        return 'off'
      }
      default: {
        return 'wait'
      }
    }
  }

  function canOfferFreeze (row: DeviceApproval): boolean {
    return row.status === 'refused'
      && row.founder.id !== auth.user?.id
      && !(openFreezes.data.value?.rows ?? []).some(f => f.frozenStaff.id === row.founder.id)
  }
</script>

<style lang="scss" scoped>
.d-sh__text { max-width: 260px; white-space: normal; font-size: 12px; }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
