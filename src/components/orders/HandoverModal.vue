<template>
  <DModal
    :max-width="440"
    :model-value="open"
    :persistent="busy"
    :title="to === 'buyer' ? 'Hand the piece to the buyer' : 'Hand the piece back to the seller'"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-hom__lead">
        {{ orderRef }}. Ask the {{ to }} for the 6-digit code in their app and type it here.
        <template v-if="to === 'buyer'">The sale completes and the seller is paid.</template>
        <template v-else>The piece leaves the market; no money moves.</template>
      </p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="codeError" label="Collection code">
        <DInput
          :id="controlId"
          v-model="code"
          autocomplete="off"
          :describedby="describedBy"
          :disabled="busy"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="6"
          placeholder="000000"
          size="lg"
        />
      </FormField>

      <p class="who2">Five wrong codes lock the handover for 15 minutes. Logged against your name.</p>

      <NoteBanner v-if="submitError" class="d-hom__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Hand over</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useOrderAction } from '@/composables/useOrders'
  import { useToast } from '@/composables/useToast'
  import { orderErrorMessage } from './orderErrors'

  // Hand a piece over against its 6-digit code (Backend spec 012 FR-016 / FR-019,
  // order.handover, at the order's branch). Staff never see the code itself.
  const props = defineProps<{ open: boolean, orderId: string, orderRef: string, to: 'buyer' | 'seller' }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useOrderAction()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const code = ref('')
  const submitted = ref(false)

  const codeError = computed(() => (submitted.value && !/^\d{6}$/.test(code.value.trim()) ? 'The code is 6 digits.' : undefined))
  // A wrong code answers with the tries left; that is the message here, not a field error.
  const submitError = computed(() => (mutation.error.value ? orderErrorMessage(mutation.error.value) : ''))

  watch(() => [props.open, props.orderId], () => {
    code.value = ''
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
    if (codeError.value !== undefined) return

    const payload = { orderId: props.orderId, action: { kind: 'handover' as const, to: props.to, code: code.value.trim() } }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(props.to === 'buyer' ? 'Handed over. The sale is complete.' : 'Handed back to the seller.')
      emit('close')
    } catch {
      // Shown in the form. A different code is a different request, so it gets a new key.
    }
  }
</script>

<style lang="scss" scoped>
.d-hom__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-hom__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
