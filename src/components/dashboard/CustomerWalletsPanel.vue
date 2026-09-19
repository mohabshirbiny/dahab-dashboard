<template>
  <Panel title="Customer wallets">
    <template #actions>
      <DBtn @click="onExport">Export</DBtn>
    </template>
    <div class="d-panel__body">
      <KeyValueRow label="Available to spend">
        <span class="num">{{ formatNumber(wallets.available) }}</span>
      </KeyValueRow>
      <KeyValueRow label="Held on open orders">
        <span class="num">{{ formatNumber(wallets.heldOnOpenOrders) }}</span>
      </KeyValueRow>
      <KeyValueRow big label="Total owed to customers">
        <span class="num">{{ formatNumber(wallets.totalOwed) }}</span>
      </KeyValueRow>
      <NoteBanner variant="info" class="d-wallets__note">
        <span>Held money is set aside against a specific order. It is still the customer's, and it returns to available if the order is cancelled.</span>
      </NoteBanner>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
  import Panel from '@/components/ui/Panel.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatNumber } from '@/composables/useFormatters'
  import { useToast } from '@/composables/useToast'
  import type { CustomerWallets } from '@/types/overview'

  defineProps<{ wallets: CustomerWallets }>()
  const { exportToExcel } = useToast()
  function onExport () { exportToExcel('customer wallets') }
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
.d-wallets__note { margin-top: 14px; }
</style>
