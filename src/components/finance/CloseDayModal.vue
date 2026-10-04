<template>
  <DModal
    :max-width="520"
    :model-value="open"
    :persistent="busy"
    title="Close the day"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit(true)">
      <p class="d-cdm__lead">{{ formatDate(day.date) }} · the books show {{ formatMoney(day.books.bank) }} EGP in the bank.</p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="balanceMessage" hint="The closing balance across all of Dahab's accounts on that day's statements." label="Bank balance at close">
        <DInput
          :id="controlId"
          v-model="balance"
          :describedby="describedBy"
          :disabled="busy"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="20"
        />
      </FormField>

      <KeyValueRow label="Difference">
        <span class="num" :class="{ 'd-cdm__bad': !zero }">{{ difference === null ? '—' : formatMoney(difference) }}</span>
      </KeyValueRow>

      <template v-if="difference !== null && !zero">
        <NoteBanner class="d-cdm__banner" variant="wait">The bank and the books do not agree. Explain the difference to lock the day, or save it and close it again once the missing entry is recorded.</NoteBanner>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="explanationMessage" label="Explanation">
          <DTextarea
            :id="controlId"
            v-model="explanation"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="1000"
            :rows="2"
          />
        </FormField>
      </template>

      <p v-else-if="zero" class="d-cdm__text">Nothing to explain. Close the day and it is locked, so tomorrow starts from a number you have already checked.</p>

      <NoteBanner v-if="submitError" class="d-cdm__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>
      <p class="who2">Logged with your name. A locked day can never be changed.</p>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn v-if="!zero" :disabled="busy || difference === null" :loading="busy && !locking" @click="onSubmit(false)">Save without locking</DBtn>
      <DBtn :disabled="difference === null" kind="primary" :loading="busy && locking" @click="onSubmit(true)">Close and lock</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CloseDay } from '@/types/finance'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { useCloseDay } from '@/composables/useFinance'
  import { formatDate, formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { financeFormError, lengthError } from './financeErrors'

  // Close an ended day against the statement (Backend spec 015 FR-014, day.close). The
  // difference shown here is only a preview; the Backend computes and stores it.
  const props = defineProps<{ open: boolean, day: CloseDay }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const balance = ref('')
  const explanation = ref('')
  const locking = ref(true)
  const submitted = ref(false)

  const mutation = useCloseDay()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const valid = computed(() => /^-?\d{1,14}(?:\.\d{1,4})?$/.test(balance.value.trim()))
  const difference = computed(() => (valid.value ? (Number(balance.value) - Number(props.day.books.bank)).toFixed(4) : null))
  const zero = computed(() => difference.value !== null && Number(difference.value) === 0)

  const balanceMessage = computed(() => (submitted.value && !valid.value ? 'Write the balance in EGP, for example 3142880 or 3142880.50.' : undefined) ?? fieldError(mutation.error.value, 'bank_balance'))
  const explanationMessage = computed(() => (submitted.value && locking.value && !zero.value ? lengthError(explanation.value, 10, 1000, 'what explains the difference') : undefined)
    ?? fieldError(mutation.error.value, 'explanation'))
  const submitError = computed(() => financeFormError(mutation.error.value))

  watch(() => [props.open, props.day.date], () => {
    balance.value = props.day.close?.bankBalance ?? ''
    explanation.value = props.day.close?.explanation ?? ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) emit('close')
  }

  async function onSubmit (lock = true) {
    if (busy.value) return
    submitted.value = true
    locking.value = lock
    if (balanceMessage.value || (lock && explanationMessage.value)) return
    const body = { date: props.day.date, bankBalance: balance.value.trim(), explanation: lock && !zero.value ? explanation.value.trim() : null }
    try {
      const result = await mutation.mutateAsync({ ...body, idempotencyKey: idempotency.keyFor(body) })
      idempotency.reset()
      toast.ok(result.state === 'locked' ? 'The day is closed and locked.' : 'Saved. The day stays open until the difference is explained.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-cdm__lead { margin: 0 0 12px; font-size: 13px; font-weight: 500; }
.d-cdm__text { margin: 8px 0; font-size: 13px; line-height: 1.6; }
.d-cdm__banner { margin: 8px 0; }
.d-cdm__bad { color: var(--bad); }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
