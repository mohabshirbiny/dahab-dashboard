<template>
  <LoadingState v-if="isPending" label="Loading the customer…" />

  <Panel v-else-if="isError">
    <ErrorState
      :message="errorMessage"
      :retryable="failure !== 'forbidden' && failure !== 'not_found'"
      :title="failure === 'not_found' ? 'We could not find this customer' : 'Could not load this customer'"
      @retry="refetch()"
    />
  </Panel>

  <template v-else-if="customer">
    <Panel :subtitle="doc ? IDENTITY_TYPE_LABELS[doc.type] : undefined" :title="customer.fullName ?? `Customer ${customer.displayRef}`">
      <template #actions>
        <DBtn aria-label="Close" @click="emit('close')">Close</DBtn>
      </template>

      <template #body>
        <div v-if="doc" class="d-review__images" :class="{ 'd-review__images--two': doc.hasBack }">
          <DocumentPreview
            :available="true"
            :document-id="doc.id"
            side="front"
            :two-sided="doc.hasBack"
            :type="doc.type"
          />

          <DocumentPreview
            v-if="doc.hasBack"
            :available="true"
            :document-id="doc.id"
            side="back"
            two-sided
            :type="doc.type"
          />
        </div>

        <NoteBanner v-else class="d-review__none" variant="wait">
          <span>No identity document came with this customer's registration.</span>
        </NoteBanner>

        <KeyValueRow label="Name on the account" :value="customer.fullName ?? '—'" />
        <KeyValueRow label="Type" :value="CUSTOMER_TYPE_LABELS[customer.type]" />
        <KeyValueRow label="Phone" :value="customer.phone" />
        <KeyValueRow label="Email" :value="customer.email ?? '—'" />
        <KeyValueRow label="Where" :value="governorateLabel(customer.governorate) || '—'" />
        <KeyValueRow label="Customer reference" :value="customer.displayRef" />

        <KeyValueRow label="Account">
          <StatusTag :label="CUSTOMER_STATUS_META[customer.status].label" :variant="CUSTOMER_STATUS_META[customer.status].variant" />
        </KeyValueRow>

        <KeyValueRow v-if="customer.suspendedReason" label="Suspended because" :value="reasonText(customer.suspendedReason)" />
        <KeyValueRow label="Joined" :value="formatDateTime(customer.submittedAt)" />
      </template>
    </Panel>

    <IdentityReviewPanel v-if="target" :target="target" />
  </template>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import DocumentPreview from '@/components/identity/DocumentPreview.vue'
  import IdentityReviewPanel from '@/components/identity/IdentityReviewPanel.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { useCustomerQuery } from '@/composables/useCustomers'
  import { formatDateTime } from '@/composables/useFormatters'
  import { errorCodeOf } from '@/services/errors'
  import { CUSTOMER_STATUS_META, CUSTOMER_TYPE_LABELS, governorateLabel } from '@/types/customer'
  import { IDENTITY_TYPE_LABELS, type IdentityReviewTarget } from '@/types/identity'

  const props = defineProps<{ customerId: string }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const { data: customer, error, isPending, isError, refetch } = useCustomerQuery(() => props.customerId)

  const failure = computed(() => errorCodeOf(error.value))
  const errorMessage = computed(() => {
    if (failure.value === 'forbidden') return 'Your account does not have permission to view customers.'
    if (failure.value === 'not_found') return 'It may have been removed, or the address may be mistyped.'
    if (failure.value === 'too_many_requests') return 'Too many requests. Wait a moment and try again.'
    return 'The customer could not be loaded. Check your connection and try again.'
  })

  const doc = computed(() => customer.value?.latestDocument ?? null)

  const target = computed<IdentityReviewTarget | null>(() => {
    const c = customer.value
    const d = doc.value
    if (!c || !d) return null
    return {
      id: d.id,
      type: d.type,
      status: d.status,
      customerRef: c.displayRef,
      reviewedAt: d.reviewedAt,
      reviewReasons: d.reviewReasons,
      reviewNote: d.reviewNote,
    }
  })

  // `suspended_reason` is a Backend code such as `fraud_review`.
  function reasonText (code: string): string {
    const words = code.replaceAll('_', ' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
  }
</script>

<style lang="scss" scoped>
.d-review__images { display: grid; gap: 12px; margin-bottom: 14px; }
.d-review__images--two { grid-template-columns: 1fr 1fr; }
.d-review__none { margin-bottom: 14px; }
@media (max-width: 1400px) {
  .d-review__images--two { grid-template-columns: 1fr; }
}
</style>
