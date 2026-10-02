<template>
  <DModal
    :max-width="500"
    :model-value="open"
    :persistent="busy"
    title="Extend a deadline"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit">
      <p class="d-edm__lead">
        {{ order.orderRef }}. Only the deadline running now can move, and only later. Both sides are told the new time.
      </p>

      <FormField v-slot="{ controlId }" label="Which deadline">
        <DSelect :id="controlId" v-model="which" :disabled="busy" :options="EXTENDABLE_DEADLINES" />
      </FormField>

      <KeyValueRow label="Now" :value="current ? formatDateTime(current) : 'Not running'" />

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="dateError" label="New deadline">
        <DInput
          :id="controlId"
          v-model="newDeadline"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          type="datetime-local"
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
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-edm__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Extend</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ExtendableDeadline, OrderDetail } from '@/types/order'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useOrderAction } from '@/composables/useOrders'
  import { useToast } from '@/composables/useToast'
  import { EXTENDABLE_DEADLINES } from '@/types/order'
  import { orderFormError, REASON_MAX, reasonError } from './orderErrors'
  import { fromLocalInput, toLocalInput } from './orderFormat'

  // Give a seller or buyer more time (Backend spec 012 FR-009, order.extend_deadline).
  const props = defineProps<{ open: boolean, order: OrderDetail }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useOrderAction()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  // The deadline the order's state runs, as the Backend reports it.
  function running (): ExtendableDeadline {
    const kind = props.order.deadline?.kind
    if (kind === 'balance') return 'balance'
    if (kind === 'collect') return 'collect'
    return 'reach_branch'
  }

  const which = ref<ExtendableDeadline>(running())
  const newDeadline = ref('')
  const reason = ref('')
  const submitted = ref(false)

  const current = computed(() => {
    switch (which.value) {
      case 'reach_branch': { return props.order.reachBranchDeadline }
      case 'balance': { return props.order.balanceDueDeadline }
      case 'collect': { return props.order.collectDeadline }
    }
    return null
  })

  const dateError = computed(() => {
    if (submitted.value && fromLocalInput(newDeadline.value) === null) return 'Pick the new date and time.'
    return fieldError(mutation.error.value, 'new_deadline')
  })
  const reasonFieldError = computed(() => (submitted.value ? reasonError(reason.value) : undefined) ?? fieldError(mutation.error.value, 'reason'))
  const submitError = computed(() => orderFormError(mutation.error.value))

  watch(() => [props.open, props.order.id], () => {
    which.value = running()
    newDeadline.value = toLocalInput(current.value)
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
    const at = fromLocalInput(newDeadline.value)
    if (at === null || reasonError(reason.value) !== undefined) return

    const payload = { orderId: props.order.id, action: { kind: 'extend' as const, which: which.value, newDeadline: at, reason: reason.value.trim() } }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Deadline extended. Both sides are told.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-edm__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-edm__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
