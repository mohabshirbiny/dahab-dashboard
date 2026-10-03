<template>
  <Panel title="Wallet">
    <template #actions>
      <DBtn @click="openStatement">Wallet statement</DBtn>
    </template>

    <div class="d-panel__body">
      <LoadingState v-if="wallet.isPending.value" label="Loading the wallet…" />

      <ErrorState
        v-else-if="wallet.isError.value"
        message="The wallet could not be loaded. Check your connection and try again."
        title="Could not load the wallet"
        @retry="wallet.refetch()"
      />

      <template v-else-if="wallet.data.value">
        <KeyValueRow label="Available to spend">
          <span class="num">{{ formatMoney(wallet.data.value.available) }}</span>
        </KeyValueRow>

        <KeyValueRow label="Held on open orders">
          <span class="num">{{ formatMoney(wallet.data.value.heldOnOrders) }}</span>
        </KeyValueRow>

        <KeyValueRow label="Withdrawals waiting for review">
          <span class="num">{{ formatMoney(wallet.data.value.pendingWithdrawals) }}</span>
        </KeyValueRow>

        <KeyValueRow big label="Total">
          <span class="num">{{ formatMoney(wallet.data.value.total) }} EGP</span>
        </KeyValueRow>
      </template>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
  import { useRouter } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useCustomerWalletQuery } from '@/composables/useWallet'

  // Rendered only for staff holding wallet.view (Backend spec 008 FR-017).
  const props = defineProps<{ customerId: string }>()

  const wallet = useCustomerWalletQuery(() => props.customerId, true)
  const router = useRouter()

  function openStatement () {
    router.push({ name: 'statement', query: { customer: props.customerId } })
  }
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
</style>
