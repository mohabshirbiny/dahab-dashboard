<template>
  <div class="d-susp">
    <div class="d-susp__title">Suspend this account</div>
    <p class="who2 d-susp__lead">They can still sign in and see their data, but cannot buy, sell or withdraw.</p>

    <form novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId }" label="Reason">
        <DSelect :id="controlId" v-model="reason" :disabled="mutation.isPending.value" :options="REASON_OPTIONS" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="Note for the record">
        <DTextarea
          :id="controlId"
          v-model="note"
          :describedby="describedBy"
          :disabled="mutation.isPending.value"
          :invalid="invalid"
          :maxlength="MAX_NOTE"
          placeholder="Required. Staff only; the customer never sees it."
          :rows="2"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-susp__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>

      <div class="d-susp__actions">
        <DBtn :disabled="mutation.isPending.value" @click="emit('cancel')">Cancel</DBtn>
        <DBtn kind="danger" :loading="mutation.isPending.value" type="submit">Suspend</DBtn>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useSuspendCustomer } from '@/composables/useCustomerFile'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { backendCodeOf, errorCodeOf } from '@/services/errors'
  import { SUSPENDED_REASON_LABELS, type SuspendedReason } from '@/types/customer'

  // The Backend accepts 1 to 1000 characters.
  const MAX_NOTE = 1000

  const REASON_OPTIONS = (Object.keys(SUSPENDED_REASON_LABELS) as SuspendedReason[])
    .map(value => ({ value, label: SUSPENDED_REASON_LABELS[value] }))

  const props = defineProps<{ customerId: string }>()
  const emit = defineEmits<{ (e: 'cancel' | 'done'): void }>()

  const mutation = useSuspendCustomer(() => props.customerId)
  const idempotency = useIdempotencyKey()
  const toast = useToast()

  const reason = ref<SuspendedReason>('piece_misrepresented')
  const note = ref('')
  const submitted = ref(false)

  const noteError = computed(() => (submitted.value && note.value.trim() === '' ? 'Write a note for the record.' : ''))

  const submitError = computed(() => {
    const error = mutation.error.value
    if (!error) return ''
    const backend = backendCodeOf(error)
    if (backend === 'customer_already_suspended') return 'Someone has already suspended this account. Reload the file to see it.'
    if (backend === 'idempotency_in_progress') return 'The first attempt is still being processed. Wait a moment and try again.'
    if (errorCodeOf(error) === 'forbidden') return 'Your account does not have permission to suspend customers.'
    if (errorCodeOf(error) === 'validation') return 'Check the reason and the note.'
    return 'The account could not be suspended. Check your connection and try again.'
  })

  async function onSubmit () {
    if (mutation.isPending.value) return
    submitted.value = true
    const text = note.value.trim()
    if (text === '') return

    const input = { reason: reason.value, note: text }
    try {
      await mutation.mutateAsync({ ...input, idempotencyKey: idempotency.keyFor(input) })
      idempotency.reset()
      toast.ok('Suspended. Logged with your name and the reason.')
      emit('done')
    } catch {
      // Shown in the form; a retry of the same input reuses the same key.
    }
  }
</script>

<style lang="scss" scoped>
.d-susp { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
.d-susp__title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.d-susp__lead { margin: 0 0 11px; }
.d-susp__error { margin-bottom: 10px; }
.d-susp__actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
