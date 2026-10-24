<template>
  <div class="d-susp">
    <div class="d-susp__title">{{ makeDealer ? 'Make this customer a market maker' : 'Make this customer ordinary again' }}</div>

    <p class="who2 d-susp__lead">
      <template v-if="makeDealer">
        A market maker can be given a dealer code, which waives Dahab's commission and gives them the buy and sell difference.
        Add the code from Promo codes.
      </template>

      <template v-else>
        They go back to being an ordinary customer. Turn off their dealer code first, or this is refused.
      </template>
    </p>

    <form novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="Note for the record">
        <DTextarea
          :id="controlId"
          v-model="note"
          :describedby="describedBy"
          :disabled="mutation.isPending.value"
          :invalid="invalid"
          :maxlength="MAX_NOTE"
          placeholder="Required. Why this customer is a market maker, or no longer one."
          :rows="2"
        />
      </FormField>

      <NoteBanner v-if="submitError" class="d-susp__error" role="alert" variant="bad">{{ submitError }}</NoteBanner>

      <div class="d-susp__actions">
        <DBtn :disabled="mutation.isPending.value" @click="emit('cancel')">Cancel</DBtn>
        <DBtn kind="primary" :loading="mutation.isPending.value" type="submit">{{ makeDealer ? 'Make market maker' : 'Make ordinary' }}</DBtn>
      </div>
    </form>
  </div>
</template>

<script lang="ts" setup>
  import type { CustomerType } from '@/types/customer'
  import { computed, ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useSetCustomerType } from '@/composables/useCustomerFile'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { backendCodeOf, errorCodeOf } from '@/services/errors'

  // The Backend accepts 1 to 1000 characters.
  const MAX_NOTE = 1000

  // `current` is what the customer is now; the form moves them to the other type.
  const props = defineProps<{ customerId: string, current: CustomerType }>()
  const emit = defineEmits<{ (e: 'cancel' | 'done'): void }>()

  const target = computed<CustomerType>(() => (props.current === 'market_maker' ? 'ordinary' : 'market_maker'))
  const makeDealer = computed(() => target.value === 'market_maker')

  const mutation = useSetCustomerType(() => props.customerId)
  const idempotency = useIdempotencyKey()
  const toast = useToast()

  const note = ref('')
  const submitted = ref(false)

  const noteError = computed(() => (submitted.value && note.value.trim() === '' ? 'Write a note for the record.' : ''))

  const submitError = computed(() => {
    const error = mutation.error.value
    if (!error) return ''
    const backend = backendCodeOf(error)
    if (backend === 'customer_type_unchanged') return 'This customer already has that type. Reload the file to see it.'
    if (backend === 'customer_has_active_dealer_code') return 'Turn off this customer\'s dealer code in Promo codes first, then try again.'
    if (backend === 'idempotency_in_progress') return 'The first attempt is still being processed. Wait a moment and try again.'
    if (errorCodeOf(error) === 'forbidden') return 'Your account does not have permission to change a customer\'s type.'
    if (errorCodeOf(error) === 'validation') return 'Check the note.'
    return 'The type could not be changed. Check your connection and try again.'
  })

  async function onSubmit () {
    if (mutation.isPending.value) return
    submitted.value = true
    const text = note.value.trim()
    if (text === '') return

    const input = { type: target.value, note: text }
    try {
      await mutation.mutateAsync({ ...input, idempotencyKey: idempotency.keyFor(input) })
      idempotency.reset()
      toast.ok(makeDealer.value ? 'Now a market maker. Logged with your name.' : 'Now an ordinary customer. Logged with your name.')
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
