<template>
  <DataTable>
    <template #head>
      <th>Order</th>
      <th>Piece</th>
      <th>Stated</th>
      <th>Branch</th>
      <th>Since</th>
      <th class="r" />
    </template>

    <tr v-for="w in rows" :key="w.orderId">
      <td class="mono">{{ w.orderRef }}</td>

      <td>
        {{ pieceTitle(w.category, w.pieceType.nameEn, null) }}
        <div class="who2"><StatusTag :label="orderStateMeta(w.state).label" :variant="orderStateMeta(w.state).variant" /></div>
      </td>

      <td class="mono">
        {{ w.statedKarat !== null ? `${w.statedKarat}K` : '—' }}<template v-if="w.statedWeightG"> · {{ formatWeight(w.statedWeightG) }} g</template>
        <div v-if="w.latestInspection" class="who2">Result: {{ outcomeMeta(w.latestInspection.outcome).label }}</div>
      </td>

      <td>{{ w.branch.nameEn ?? '—' }}</td>
      <td>{{ formatRelativeTime(w.since) }}</td>

      <td class="r">
        <DBtn v-if="w.task && allowed(w.task)" :kind="w.task === 'correct' ? 'default' : 'primary'" @click="emit('act', w)">
          {{ TASK_LABELS[w.task] }}
        </DBtn>

        <span v-else-if="w.task" class="who2">{{ TASK_WAITING[w.task] }}</span>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { WorkListItem, WorkTask } from '@/types/order'
  import { formatWeight } from '@/components/listings/listingFormat'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatRelativeTime } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { orderStateMeta, outcomeMeta, pieceTitle } from '@/types/order'
  import { PERMISSIONS } from '@/types/staff'

  // The pieces at the branch (Backend spec 012 FR-010): only what receiving, inspecting
  // and handing over need — no price, no wallet, no buyer or seller.
  defineProps<{ rows: WorkListItem[] }>()
  const emit = defineEmits<{ (e: 'act', item: WorkListItem): void }>()

  const TASK_LABELS: Record<WorkTask, string> = {
    receive: 'Mark received',
    inspect: 'Enter result',
    correct: 'Correct result',
    handover: 'Hand to the buyer',
    return_handover: 'Hand back to the seller',
  }
  const TASK_WAITING: Record<WorkTask, string> = {
    receive: 'Waiting for the seller',
    inspect: 'Waiting for IGI',
    correct: 'Waiting for the buyer',
    handover: 'Ready to collect',
    return_handover: 'Held for the seller',
  }

  const { can } = usePermissions()
  function allowed (task: WorkTask): boolean {
    switch (task) {
      case 'receive': { return can(PERMISSIONS.orderReceive) }
      case 'inspect':
      case 'correct': { return can(PERMISSIONS.inspectionEnter) }
      case 'handover':
      case 'return_handover': { return can(PERMISSIONS.orderHandover) }
    }
    return false
  }
</script>
