<template>
  <DModal
    :max-width="500"
    :model-value="open"
    :persistent="busy"
    title="Propose a new price"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-ppm__lead">
        {{ order.orderRef }}. The stone came in below what the seller claimed. The buyer agreed to
        {{ formatMoney(order.lockedTotalPrice) }} EGP; propose what the piece is worth now. The buyer
        then accepts the new price or declines and gets their deposit back in full.
      </p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="priceError" label="New price for the buyer (EGP)">
        <DInput
          :id="controlId"
          v-model="price"
          :describedby="describedBy"
          :disabled="busy"
          inputmode="numeric"
          :invalid="invalid"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonFieldError" label="Reason">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          placeholder="Both sides read this. Say how the price was worked out."
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-ppm__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Send to the buyer</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { OrderDetail } from '@/types/order'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useOrderAction } from '@/composables/useOrders'
  import { useToast } from '@/composables/useToast'
  import { orderFormError, REASON_MAX, reasonError } from './orderErrors'

  // After a lower stone grade (Backend spec 012 FR-012a, order.price_adjust).
  const props = defineProps<{ open: boolean, order: OrderDetail }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useOrderAction()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const price = ref('')
  const reason = ref('')
  const submitted = ref(false)

  const priceError = computed(() => {
    if (submitted.value && !/^\d+(?:\.\d{1,4})?$/.test(price.value.trim())) return 'Enter an amount in EGP, for example 48250.'
    return fieldError(mutation.error.value, 'price')
  })
  const reasonFieldError = computed(() => (submitted.value ? reasonError(reason.value) : undefined) ?? fieldError(mutation.error.value, 'reason'))
  const submitError = computed(() => orderFormError(mutation.error.value))

  watch(() => [props.open, props.order.id], () => {
    price.value = ''
    reason.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (priceError.value !== undefined || reasonError(reason.value) !== undefined) return

    const payload = { orderId: props.order.id, action: { kind: 'propose-price' as const, price: price.value.trim(), reason: reason.value.trim() } }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Sent. The buyer decides on the new price.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-ppm__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-ppm__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
