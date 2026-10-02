<template>
  <DModal
    :max-width="560"
    :model-value="open"
    :persistent="busy"
    title="Cancel this acceptance"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-cam__lead">
        Order {{ order.orderRef }} for {{ title }} is cancelled. The buyer gets their deposit
        <template v-if="order.depositAmount">({{ formatMoney(order.depositAmount) }} EGP)</template>
        back in full at once, and both sides are told why. This is not counted against the seller.
      </p>

      <div class="d-cam__label">What happens to the piece</div>

      <label class="d-cam__choice">
        <input
          v-model="relist"
          :disabled="busy"
          name="relist"
          type="radio"
          :value="true"
        >
        Put it back on the market (nobody in line)
      </label>

      <label class="d-cam__choice">
        <input
          v-model="relist"
          :disabled="busy"
          name="relist"
          type="radio"
          :value="false"
        >
        Withdraw the piece for good
      </label>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" label="Reason">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="NOTE_MAX"
          placeholder="Buyer and seller read this. Say plainly why the sale is cancelled."
          :rows="4"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-cam__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>

      <p class="who2 d-cam__foot">Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Keep the sale</DBtn>
      <DBtn kind="danger" :loading="busy" @click="onSubmit">Cancel acceptance</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ListingOrder } from '@/types/listing'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useCancelOrder } from '@/composables/useListings'
  import { useToast } from '@/composables/useToast'
  import { formLevelError, NOTE_MAX, noteError } from './listingErrors'

  // Cancel an accepted sale (Backend spec 011 FR-020a, order.cancel): the order becomes
  // cancelled_staff, the buyer is refunded in full, the piece is relisted or withdrawn.
  // Sent once (Idempotency-Key) and audited by the Backend.
  // Also opened from an order on the Orders page (Backend spec 012), hence the narrow order type.
  const props = defineProps<{ open: boolean, order: Pick<ListingOrder, 'id' | 'orderRef' | 'depositAmount'>, listingId: string, title: string }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useCancelOrder()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const reason = ref('')
  const relist = ref(true)
  const submitted = ref(false)

  const reasonError = computed(() => {
    const local = submitted.value ? noteError(reason.value, 'why the sale is cancelled') : undefined
    return local ?? fieldError(mutation.error.value, 'reason')
  })
  const submitError = computed(() => formLevelError(mutation.error.value))

  watch(() => [props.open, props.order.id], () => {
    reason.value = ''
    relist.value = true
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) {
      emit('close')
    }
  }

  async function onSubmit () {
    if (busy.value) return
    submitted.value = true
    if (noteError(reason.value, 'why the sale is cancelled') !== undefined) {
      return
    }

    const payload = { orderId: props.order.id, listingId: props.listingId, reason: reason.value.trim(), relist: relist.value }
    try {
      const result = await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(`Cancelled. ${formatMoney(result.refunded)} EGP went back to the buyer.`)
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-cam__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-cam__label { margin: 8px 0 6px; font-size: 11.5px; color: var(--ink-2); }
.d-cam__choice { display: flex; gap: 8px; align-items: center; font-size: 13px; margin-bottom: 6px; }
.d-cam__error { margin-top: 10px; }
.d-cam__foot { margin: 10px 0 0; }
</style>
