<template>
  <Panel title="Customer wallets">
    <template #actions>
      <DBtn @click="openStatement">Wallet statement</DBtn>
    </template>

    <div class="d-panel__body">
      <KeyValueRow label="Available to spend">
        <span class="num">{{ formatMoney(wallets.available) }}</span>
      </KeyValueRow>

      <KeyValueRow label="Held on open orders">
        <span class="num">{{ formatMoney(wallets.heldOnOpenOrders) }}</span>
      </KeyValueRow>

      <KeyValueRow big label="Total owed to customers">
        <span class="num">{{ formatMoney(wallets.totalOwed) }}</span>
      </KeyValueRow>

      <NoteBanner class="d-wallets__note" variant="info">
        <span>Held money is set aside against a specific order. It is still the customer's, and it returns to available if the order is cancelled.</span>
      </NoteBanner>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
  import type { CustomerWallets } from '@/types/overview'
  import { useRouter } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatMoney } from '@/composables/useFormatters'

  // Live from the ledger (Backend spec 008); shown only to staff holding wallet.view.
  defineProps<{ wallets: CustomerWallets }>()

  const router = useRouter()
  function openStatement () {
    router.push({ name: 'statement' })
  }
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
.d-wallets__note { margin-top: 14px; }
</style>
