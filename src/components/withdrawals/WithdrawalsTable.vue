<template>
  <DataTable>
    <template #head>
      <th>Requested</th>
      <th class="r">Amount</th>
      <th>Where it goes</th>
      <th>Before you release</th>
      <th>State</th>
      <th class="r" />
    </template>

    <tr v-for="w in rows" :key="w.id" :class="{ 'd-wt__on': w.id === selectedId }">
      <td>
        <span class="nowrap">{{ formatDateTime(w.requestedAt) }}</span>
        <div class="who2">{{ w.customer.fullName ?? '—' }} · {{ w.customer.displayRef ?? '—' }}</div>
        <div class="who2 mono">{{ w.number }}</div>
      </td>

      <td class="r">
        <span class="mono">{{ formatMoney(w.amount) }}</span>
        <div class="who2">Of {{ formatMoney(w.customer.available) }} available</div>
      </td>

      <td>
        <template v-if="w.account">
          <span class="nowrap">{{ w.account.bankName }} {{ w.account.numberMasked }}</span>
          <div class="who2">{{ w.account.accountName }}</div>
          <div v-if="w.account.checked" class="who2">Name checked{{ w.account.checked.by ? ` by ${w.account.checked.by}` : '' }}, {{ formatDate(w.account.checked.at) }}</div>
        </template>

        <template v-else>—</template>
      </td>

      <td>
        <div v-for="signal in signalsOf(w)" :key="signal.text" class="d-wt__signal" :class="`d-wt__signal--${signal.tone}`">{{ signal.text }}</div>
      </td>

      <td><StatusTag :label="withdrawalStateMeta(w).label" :variant="withdrawalStateMeta(w).variant" /></td>

      <td class="r">
        <DBtn :kind="w.id === selectedId ? 'default' : 'primary'" @click="emit('open', w.id)">Open</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { Withdrawal } from '@/types/withdrawal'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDate, formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { withdrawalStateMeta } from '@/types/withdrawal'
  import { signalLines } from './withdrawalSignals'

  defineProps<{ rows: Withdrawal[], selectedId: string | null }>()

  const emit = defineEmits<{ (e: 'open', id: string): void }>()

  const signalsOf = (w: Withdrawal) => signalLines(w)
</script>

<style lang="scss" scoped>
.d-wt__on td { background: var(--row-head); }
.d-wt__signal { font-size: 11.5px; line-height: 1.5; }
.d-wt__signal--ok { color: var(--ink-2); }
.d-wt__signal--wait { color: var(--wait); }
.d-wt__signal--bad { color: var(--bad); }
</style>
