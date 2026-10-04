<template>
  <DModal
    :max-width="480"
    :model-value="open"
    :persistent="busy"
    title="Answer the request for more time"
    @update:model-value="close"
  >
    <form v-if="request" novalidate @submit.prevent="onSubmit">
      <p class="d-aem__lead">
        {{ request.order?.ref ?? '' }}. The seller asks for more time to bring the piece to the branch.
        <template v-if="request.deadlineNow"> The deadline is {{ formatDateTime(request.deadlineNow) }}.</template>
      </p>

      <KeyValueRow label="Reason" :value="request.reasonLabel" />
      <div class="d-aem__text">{{ request.detail }}</div>
      <KeyValueRow v-if="request.extensionsBefore !== null" label="Extensions before" :value="request.extensionsBefore" />

      <FormField v-slot="{ controlId }" label="Your answer">
        <DSelect :id="controlId" v-model="answer" :disabled="busy" :options="ANSWERS" />
      </FormField>

      <FormField v-if="answer === 'accept'" v-slot="{ controlId }" label="How much more time">
        <DSelect :id="controlId" v-model="hours" :disabled="busy" :options="HOUR_OPTIONS" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="Note for the record">
        <DTextarea
          :id="controlId"
          v-model="note"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="NOTE_MAX"
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-aem__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">The seller is told by SMS and email. Logged against your name.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn :kind="answer === 'accept' ? 'primary' : 'danger'" :loading="busy" @click="onSubmit">{{ answer === 'accept' ? 'Give more time' : 'Refuse' }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ExtensionHours, ExtensionRequest } from '@/types/order'
  import { computed, ref, watch } from 'vue'
  import { lengthError, NOTE_MAX, NOTE_MIN } from '@/components/disputes/disputeErrors'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useAnswerExtension } from '@/composables/useOrders'
  import { useToast } from '@/composables/useToast'
  import { EXTENSION_HOURS } from '@/types/order'
  import { orderErrorMessage } from './orderErrors'

  // Accept a seller's request for more time with 6, 12, 24 or 48 working hours, or refuse
  // it (Backend spec 014, order.extend_deadline). The Backend moves the deadline.
  const props = defineProps<{ open: boolean, request: ExtensionRequest | null }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const ANSWERS: ReadonlyArray<{ value: 'accept' | 'refuse', label: string }> = [
    { value: 'accept', label: 'Give more time' },
    { value: 'refuse', label: 'Refuse' },
  ]
  const HOUR_OPTIONS = EXTENSION_HOURS.map(h => ({ value: String(h), label: `${h} working hours` }))

  const mutation = useAnswerExtension()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const answer = ref<'accept' | 'refuse'>('accept')
  const hours = ref('24')
  const note = ref('')
  const submitted = ref(false)

  const noteError = computed(() => (submitted.value ? lengthError(note.value, NOTE_MIN, NOTE_MAX, 'a note') : undefined) ?? fieldError(mutation.error.value, 'note'))
  const submitError = computed(() => (mutation.error.value && !fieldError(mutation.error.value, 'note') ? orderErrorMessage(mutation.error.value) : ''))

  watch(() => [props.open, props.request?.id], () => {
    answer.value = 'accept'
    hours.value = '24'
    note.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit () {
    if (busy.value || !props.request) return
    submitted.value = true
    if (noteError.value !== undefined) return

    const payload = { id: props.request.id, accept: answer.value === 'accept', hours: Number(hours.value) as ExtensionHours, note: note.value.trim() }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok(payload.accept ? 'More time given. The seller has been told.' : 'Refused. The seller has been told.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-aem__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-aem__text {
  margin: 6px 0 10px;
  font-size: 12.5px;
  color: var(--ink-2);
  background: var(--bg);
  padding: 9px 11px;
  border-radius: 7px;
  white-space: pre-wrap;
}
.d-aem__error { margin-top: 10px; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
