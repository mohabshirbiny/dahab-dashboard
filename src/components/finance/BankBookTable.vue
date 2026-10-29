<template>
  <DataTable>
    <template #head>
      <th>When</th>
      <th>What</th>
      <th>Bank</th>
      <th class="r">In</th>
      <th class="r">Out</th>
      <th class="r">Cash after</th>
      <th>By</th>
    </template>

    <tr v-for="r in rows" :key="r.ledgerTxnId">
      <td class="nowrap">{{ formatDateTime(r.at) }}</td>

      <td>
        {{ title(r) }}
        <div class="who2">{{ detail(r) }}</div>
      </td>

      <!-- Owner notes of 2026-10-29: the Dahab account; none for money recorded before banks were named. -->
      <td>{{ r.bank?.label ?? 'Not assigned' }}</td>

      <td class="r mono">{{ r.direction === 'in' ? formatMoney(r.amount) : '—' }}</td>
      <td class="r mono">{{ r.direction === 'out' ? formatMoney(r.amount) : '—' }}</td>
      <td class="r mono">{{ formatMoney(r.cashAfter) }}</td>
      <td>{{ r.actor.name ?? (r.actor.type === 'system' ? 'System' : 'Customer') }}</td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { BankBookRow } from '@/types/finance'
  import DataTable from '@/components/ui/DataTable.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'

  // Every posting on the bank account (Backend spec 015 FR-011) with where it came from.
  defineProps<{ rows: BankBookRow[] }>()

  function title (r: BankBookRow): string {
    switch (r.source.type) {
      case 'topup': { return 'Top-up' }
      case 'withdrawal': { return 'Withdrawal sent' }
      case 'bank_movement': { return r.source.kindLabel }
      case 'reversal': { return 'Correction' }
    }
    return r.kind.replaceAll('_', ' ')
  }

  function detail (r: BankBookRow): string {
    const s = r.source
    switch (s.type) {
      case 'topup': {
        const how = s.how === 'credited_by_hand' ? 'Credited by hand' : (s.how === 'matched_notice' ? 'Matched notice' : '')
        return [s.reference, s.customerRef, how, s.receivingAccount].filter(Boolean).join(' · ')
      }
      case 'withdrawal': { return [s.number, s.customerRef, s.bankTxnNumber ? `Bank ${s.bankTxnNumber}` : null].filter(Boolean).join(' · ') }
      case 'bank_movement': { return [s.number, s.reason, `Statement ${s.occurredOn}`].join(' · ') }
      case 'reversal': { return s.memo ?? '' }
    }
    return s.memo ?? ''
  }
</script>

<style lang="scss" scoped>
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
