<template>
  <Panel subtitle="The founder who is not frozen always confirms last" title="Freeze and unfreeze">
    <LoadingState v-if="freezes.isPending.value || (isFounder && founders.isPending.value)" label="Loading…" />

    <ErrorState
      v-else-if="freezes.isError.value"
      :message="securityErrorMessage(freezes.error.value)"
      title="Could not load the freezes"
      @retry="freezes.refetch()"
    />

    <template v-else>
      <DataTable v-if="isFounder && others.length > 0">
        <template #head>
          <th>Founder</th>
          <th>State</th>
          <th class="r" />
        </template>

        <tr v-for="founder in others" :key="founder.id">
          <td><b>{{ founder.name }}</b></td>

          <td>
            <StatusTag v-if="openFreezeOf(founder.id)" label="Frozen" variant="bad" />
            <StatusTag v-else label="Active" variant="ok" />
          </td>

          <td class="r">
            <DBtn v-if="!openFreezeOf(founder.id)" kind="danger" @click="emit('freeze', founder)">Freeze</DBtn>
          </td>
        </tr>
      </DataTable>

      <div class="d-fp__open">
        <h3 class="d-fp__label">Open freezes</h3>

        <EmptyState v-if="openRows.length === 0" description="Nobody is frozen." title="No open freeze" />

        <DataTable v-else>
          <template #head>
            <th>Frozen</th>
            <th>By</th>
            <th>Reason</th>
            <th>Confirmations</th>
            <th class="r" />
          </template>

          <tr v-for="row in openRows" :key="row.id">
            <td>
              <b>{{ row.frozenStaff.name }}</b>
              <div class="who2">{{ formatDateTime(row.frozenAt) }}</div>
            </td>

            <td>{{ row.frozenBy.name }}</td>
            <td class="d-fp__reason">{{ row.reason }}</td>

            <td>
              <StatusTag :label="stageLabel(row)" :variant="row.stage === 'awaiting_first' ? 'wait' : 'info'" />
            </td>

            <td class="r nowrap">
              <DBtn v-if="row.canConfirm" kind="primary" @click="unfreezing = row">Confirm unfreeze</DBtn>
              <span v-else class="who2">{{ waitingText(row) }}</span>
            </td>
          </tr>
        </DataTable>
      </div>
    </template>

    <UnfreezeModal :freeze="unfreezing" :open="unfreezing !== null" @close="unfreezing = null" />
  </Panel>
</template>

<script lang="ts" setup>
  import type { AccountFreeze, StaffRefLite } from '@/types/security'
  import { computed, ref } from 'vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useFounderDevicesQuery, useFreezesQuery } from '@/composables/useSecurity'
  import { useAuthStore } from '@/stores/auth'
  import { securityErrorMessage } from './securityErrors'
  import UnfreezeModal from './UnfreezeModal.vue'

  // Backend spec 021 Story 2: the other founder with Freeze (founders), and the open freezes
  // with their confirmations (founders and holders of founder.unfreeze_second).
  const emit = defineEmits<{ (e: 'freeze', target: StaffRefLite): void }>()

  const auth = useAuthStore()
  const isFounder = computed(() => Boolean(auth.user?.isFounder))

  const freezes = useFreezesQuery('open')
  // The founders list comes with their devices (founders only).
  const founders = useFounderDevicesQuery(isFounder)

  const openRows = computed(() => freezes.data.value?.rows ?? [])
  const others = computed(() => (founders.data.value ?? []).map(f => f.founder).filter(f => f.id !== auth.user?.id))

  const unfreezing = ref<AccountFreeze | null>(null)

  function openFreezeOf (staffId: string): AccountFreeze | undefined {
    return openRows.value.find(f => f.frozenStaff.id === staffId)
  }

  function stageLabel (row: AccountFreeze): string {
    return row.stage === 'awaiting_first' ? 'Waiting for confirmation 1' : 'Waiting for the founder (2)'
  }

  function waitingText (row: AccountFreeze): string {
    if (row.stage === 'awaiting_first') {
      return row.mySlot === 2 ? 'Waiting for the frozen founder or the stand-in' : 'Waiting'
    }
    return row.mySlot === 1 ? 'Waiting for a founder' : 'Waiting'
  }
</script>

<style lang="scss" scoped>
.d-fp__open { padding: 14px 16px 6px; }
.d-fp__label { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--ink-2); }
.d-fp__reason { max-width: 280px; white-space: normal; }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
