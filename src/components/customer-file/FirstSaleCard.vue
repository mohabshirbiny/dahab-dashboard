<template>
  <Panel subtitle="Paid ahead, before the buyer pays" title="First-sale advance">
    <template #body>
      <NoteBanner v-if="error" class="d-fs__note" role="alert" variant="bad">{{ error }}</NoteBanner>

      <template v-if="firstSale.state === 'used' && firstSale.advance">
        <KeyValueRow label="Paid ahead" :value="`${formatMoney(firstSale.advance.amountEgp)} EGP`" />
        <KeyValueRow label="How" :value="firstSale.advance.basis === 'promo_code' ? 'A first-sale code' : firstSale.advance.basis === 'staff_enablement' ? 'Enabled by staff' : 'Their first sale'" />
        <KeyValueRow label="State" :value="STATE_LABEL[firstSale.advance.status]" />
        <KeyValueRow label="When" :value="formatDateTime(firstSale.advance.advancedAt)" />
        <p class="who2 d-fs__line">A seller is paid ahead once. This one will not be again.</p>
      </template>

      <template v-else-if="firstSale.state === 'enabled' && firstSale.enablement">
        <p class="d-fs__line">Enabled on {{ formatDateTime(firstSale.enablement.createdAt) }}. Their next gold sale is paid ahead when IGI confirms the piece.</p>
        <p class="who2 d-fs__line">“{{ firstSale.enablement.reason }}”</p>
        <DBtn kind="danger" @click="revokeOpen = true">Revoke</DBtn>
      </template>

      <template v-else>
        <p class="d-fs__line">Not enabled. A seller's first sale is paid ahead without this when the piece is gold and the advance is switched on; enabling only records that you vouch for this seller in person.</p>
        <DBtn kind="primary" @click="enableOpen = true">Enable</DBtn>
      </template>
    </template>
  </Panel>

  <ReasonModal
    v-model="enableOpen"
    confirm-label="Enable"
    lead="Their next eligible gold sale is paid ahead, up to the first-sale cap. Recorded against your name."
    :loading="enable.isPending.value"
    placeholder="For example: seen the piece and the invoice at the branch."
    title="Enable the first-sale advance"
    @confirm="onEnable"
  />

  <ReasonModal
    v-model="revokeOpen"
    confirm-label="Revoke"
    :loading="revoke.isPending.value"
    placeholder="Why it is taken back."
    title="Revoke the enablement"
    @confirm="onRevoke"
  />
</template>

<script lang="ts" setup>
  import type { CustomerFirstSale } from '@/types/customer'
  import { ref } from 'vue'
  import ReasonModal from '@/components/pricing/ReasonModal.vue'
  import { accessErrorMessage } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useEnableFirstSale, useRevokeFirstSale } from '@/composables/useFirstSale'
  import { formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { backendCodeOf } from '@/services/errors'

  // The first-sale advance on the customer file (Backend spec 023 R15); shown only to first_sale.manage.
  const props = defineProps<{ customerId: string, firstSale: CustomerFirstSale }>()

  const STATE_LABEL = { outstanding: 'Waiting for the buyer to pay', recovered: 'Recovered at the buyer\'s payment', written_off: 'Written off' } as const

  const toast = useToast()
  const key = useIdempotencyKey()
  const enable = useEnableFirstSale()
  const revoke = useRevokeFirstSale()
  const enableOpen = ref(false)
  const revokeOpen = ref(false)
  const error = ref('')

  function message (e: unknown): string {
    switch (backendCodeOf(e)) {
      case 'first_sale_not_eligible': {
        return 'This seller has already been paid ahead once.'
      }
      case 'first_sale_enablement_open': {
        return 'It is already enabled for this seller.'
      }
      case 'first_sale_enablement_not_found': {
        return 'It is not enabled for this seller any more.'
      }
      default: {
        return accessErrorMessage(e)
      }
    }
  }

  function onEnable (reason: string) {
    error.value = ''
    enable.mutate({ customerId: props.customerId, reason, idempotencyKey: key.keyFor([props.customerId, reason]) }, {
      onSuccess: () => {
        key.reset()
        enableOpen.value = false
        toast.ok('Enabled and logged against your name.')
      },
      onError: e => {
        enableOpen.value = false
        error.value = message(e)
      },
    })
  }

  function onRevoke (reason: string) {
    error.value = ''
    revoke.mutate({ customerId: props.customerId, reason, idempotencyKey: key.keyFor([props.customerId, 'revoke', reason]) }, {
      onSuccess: () => {
        key.reset()
        revokeOpen.value = false
        toast.ok('Revoked and logged.')
      },
      onError: e => {
        revokeOpen.value = false
        error.value = message(e)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-fs__note { margin-bottom: 10px; }
.d-fs__line { margin: 0 0 10px; font-size: 12.5px; color: var(--ink-2); }
</style>
