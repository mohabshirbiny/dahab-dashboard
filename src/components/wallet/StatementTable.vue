<template>
  <DataTable>
    <template #head>
      <th>{{ grain === 'each' ? 'When' : grain === 'day' ? 'Day' : 'Month' }}</th>
      <th>What</th>
      <!-- An order number, or a top-up's TOP-n (Backend spec 009). -->
      <th>Reference</th>
      <th class="r">Before</th>
      <th class="r">In</th>
      <th class="r">Out</th>
      <th class="r">After</th>

      <template v-if="split">
        <th class="r">Commission</th>
        <th class="r">Spread</th>
      </template>
    </template>

    <template v-for="row in rows" :key="row.kind === 'movement' ? row.id : row.period">
      <tr v-if="row.kind === 'movement'" :class="{ 'd-st__hand': row.byHand }">
        <td>{{ formatDateTime(row.createdAt) }}</td>

        <td>
          {{ row.label }}
          <div v-if="row.wallet" class="who2">Wallet {{ row.wallet.displayRef }}</div>
          <div v-if="row.movedToHeld && row.movedToHeld !== '0.0000'" class="who2">{{ movedNote(row.movedToHeld) }}</div>
          <div v-if="row.heldAfter !== null && isHoldMove(row.eventKind)" class="who2">Held after: {{ formatMoney(row.heldAfter) }}</div>
          <div v-if="row.memo" class="who2">{{ row.memo }}</div>
          <div v-if="row.actor.type !== 'customer' && row.actor.name" class="who2">By {{ row.actor.name }}</div>
        </td>

        <td class="mono">{{ row.reference ?? '—' }}</td>
        <td class="r mono d-st__muted">{{ formatMoney(row.before) }}</td>
        <td class="r mono d-st__in">{{ dash(row.in) }}</td>
        <td class="r mono">{{ dash(row.out) }}</td>
        <td class="r mono d-st__after">{{ formatMoney(row.after) }}</td>

        <template v-if="split">
          <td class="r mono">{{ dash(row.commission ?? '0') }}</td>
          <td class="r mono">{{ dash(row.spread ?? '0') }}</td>
        </template>
      </tr>

      <tr v-else>
        <td>{{ grain === 'day' ? formatDate(row.period) : monthLabel(row.period) }}</td>
        <td>{{ row.count }} {{ row.count === 1 ? 'movement' : 'movements' }}</td>
        <td class="mono">—</td>
        <td class="r mono d-st__muted">{{ formatMoney(row.before) }}</td>
        <td class="r mono d-st__in">{{ dash(row.in) }}</td>
        <td class="r mono">{{ dash(row.out) }}</td>
        <td class="r mono d-st__after">{{ formatMoney(row.after) }}</td>

        <template v-if="split">
          <td class="r mono">{{ dash(row.commission ?? '0') }}</td>
          <td class="r mono">{{ dash(row.spread ?? '0') }}</td>
        </template>
      </tr>
    </template>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { StatementGrain, StatementRow } from '@/types/wallet'
  import { computed } from 'vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import { formatDate, formatDateTime, formatMoney } from '@/composables/useFormatters'

  const props = defineProps<{ rows: StatementRow[], grain: StatementGrain }>()

  // The Dahab view carries commission and spread per row (Backend testing fixes).
  const split = computed(() => props.rows.some(r => r.commission !== null))

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  function dash (value: string): string {
    return Number(value) === 0 ? '—' : formatMoney(value)
  }

  function monthLabel (period: string): string {
    const [year, month] = period.split('-')
    return `${MONTHS[Number(month) - 1] ?? month} ${year}`
  }

  function isHoldMove (eventKind: string): boolean {
    return eventKind === 'deposit_hold' || eventKind === 'deposit_release'
  }

  function movedNote (amount: string): string {
    return Number(amount) > 0 ? `${formatMoney(amount)} moved to held` : `${formatMoney(String(-Number(amount)))} moved back to available`
  }
</script>

<style lang="scss" scoped>
.who2 { font-size: 11.5px; color: var(--ink-3); margin-top: 2px; }
.d-st__muted { color: var(--ink-3); }
.d-st__in { color: var(--ok); }
.d-st__after { font-weight: 600; }
// Entered by hand rather than produced by a transaction (design: amber rows).
.d-st__hand td { background: var(--wait-bg); }
</style>
