<template>
  <DataTable>
    <template #head>
      <th>Method</th>
      <th>Account</th>
      <th>Customers see</th>
      <th class="r">Daily limit</th>
      <th>Status</th>
      <th v-if="canManage" class="r" />
    </template>

    <tr v-for="a in rows" :key="a.id">
      <td>{{ TOPUP_METHOD_LABELS[a.method] }}<div class="who2">Order {{ a.sortOrder }}</div></td>

      <td>
        {{ a.label }}
        <div class="who2">Changed {{ formatDateTime(a.updatedAt) }}{{ a.updatedBy ? ` by ${a.updatedBy.fullName}` : '' }}</div>
      </td>

      <td class="mono">
        <div v-for="line in details(a)" :key="line">{{ line }}</div>
        <div v-if="a.providerFeePercent !== null" class="who2">Provider fee shown: {{ Number(a.providerFeePercent) }}%</div>
      </td>

      <td class="r mono">{{ a.dailyLimit ? `${formatMoney(a.dailyLimit)} EGP` : '—' }}</td>
      <td><StatusTag :label="a.isActive ? 'Shown to customers' : 'Hidden'" :variant="a.isActive ? 'ok' : 'off'" /></td>

      <td v-if="canManage" class="r d-at__actions">
        <DBtn @click="emit('edit', a)">Edit</DBtn>
        <DBtn :kind="a.isActive ? 'default' : 'primary'" :loading="togglingId === a.id" @click="emit('toggle', a)">{{ a.isActive ? 'Hide' : 'Show' }}</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { ReceivingAccount } from '@/types/topup'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { TOPUP_METHOD_LABELS } from '@/types/topup'

  defineProps<{ rows: ReceivingAccount[], canManage: boolean, togglingId: number | null }>()
  const emit = defineEmits<{ (e: 'edit' | 'toggle', account: ReceivingAccount): void }>()

  function details (a: ReceivingAccount): string[] {
    return [a.bankName, a.accountHolder, a.accountNumber, a.iban, a.instapayAddress, a.walletNumber]
      .filter((v): v is string => v !== null && v !== '')
  }
</script>

<style lang="scss" scoped>
.d-at__actions { white-space: nowrap; }
.d-at__actions > * + * { margin-left: 6px; }
</style>
