<template>
  <DataTable>
    <template #head>
      <th>Order</th>
      <th>Seller's reason</th>
      <th>Deadline now</th>
      <th>Before</th>
      <th>State</th>
      <th class="r" />
    </template>

    <tr v-for="r in rows" :key="r.id">
      <td>
        <span class="mono">{{ r.order?.ref ?? '—' }}</span>
        <div class="who2">{{ r.order?.branch?.nameEn ?? '—' }} · seller {{ r.seller?.displayRef ?? '—' }}</div>
      </td>

      <td>
        {{ r.reasonLabel }}
        <div class="who2 d-ert__detail">{{ r.detail }}</div>
      </td>

      <td>
        <span class="nowrap">{{ r.deadlineNow ? formatDateTime(r.deadlineNow) : '—' }}</span>
        <div v-if="r.state === 'waiting' && r.secondsLeft !== null" class="who2" :class="{ 'd-ert__late': r.secondsLeft <= 0 }">{{ leftLabel(r.secondsLeft) }}</div>
      </td>

      <td>{{ r.extensionsBefore ?? '—' }}</td>

      <td>
        <StatusTag :label="EXTENSION_STATE_META[r.state].label" :variant="EXTENSION_STATE_META[r.state].variant" />
        <div v-if="r.hoursGranted" class="who2">+{{ r.hoursGranted }} working hours</div>
        <div v-if="r.answeredBy" class="who2">{{ r.answeredBy.name ?? '—' }}</div>
      </td>

      <td class="r">
        <div class="d-ert__btns">
          <DBtn v-if="canAnswer && r.state === 'waiting'" kind="primary" @click="emit('answer', r)">Answer</DBtn>
          <DBtn v-if="r.order" @click="emit('open', r.order.id)">Open order</DBtn>
        </div>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { ExtensionRequest } from '@/types/order'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { EXTENSION_STATE_META } from '@/types/order'

  // Sellers' requests for more time to bring the piece (Backend spec 014 US5).
  defineProps<{ rows: ExtensionRequest[], canAnswer: boolean }>()

  const emit = defineEmits<{
    (e: 'answer', request: ExtensionRequest): void
    (e: 'open', orderId: string): void
  }>()

  function leftLabel (seconds: number): string {
    if (seconds <= 0) return 'passed'
    const hours = Math.floor(seconds / 3600)
    return hours < 1 ? `${Math.max(1, Math.floor(seconds / 60))}m left` : `${hours}h left`
  }
</script>

<style lang="scss" scoped>
.d-ert__detail { max-width: 320px; white-space: pre-wrap; }
.d-ert__late { color: var(--bad); }
.d-ert__btns { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
</style>
