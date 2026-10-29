<template>
  <DModal
    :max-width="600"
    :model-value="open"
    :persistent="busy"
    title="Close the day"
    @update:model-value="close"
  >
    <form novalidate @submit.prevent="onSubmit(true)">
      <p class="d-cdm__lead">{{ formatDate(day.date) }} · the books show {{ formatMoney(day.books.bank) }} EGP in the bank.</p>

      <!-- Owner notes of 2026-10-29: one statement balance per account, each with its own difference. -->
      <p class="who2 d-cdm__hint">Type the closing balance on that day's statement of each account.</p>

      <div v-for="bank in day.banks" :key="bank.receivingAccountId" class="d-cdm__bank">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="balanceMessage(bank.receivingAccountId)" :label="bankLabel(bank)">
          <DInput
            :id="controlId"
            v-model="balances[bank.receivingAccountId]"
            :describedby="describedBy"
            :disabled="busy"
            inputmode="numeric"
            :invalid="invalid"
            :maxlength="20"
          />
        </FormField>

        <div class="d-cdm__figures">
          <span>Books {{ formatMoney(bank.books) }}</span>

          <span :class="{ 'd-cdm__bad': lineDifference(bank) !== null && Number(lineDifference(bank)) !== 0 }">
            Difference {{ lineDifference(bank) === null ? '—' : formatMoney(lineDifference(bank)!) }}
          </span>
        </div>
      </div>

      <KeyValueRow v-if="Number(day.notAssigned) !== 0" label="Not assigned to an account">
        <span class="num d-cdm__bad">{{ formatMoney(day.notAssigned) }}</span>
      </KeyValueRow>

      <p v-if="Number(day.notAssigned) !== 0" class="who2">Money recorded before banks were named. Move it to its account with an own-account transfer under Bank movements.</p>

      <KeyValueRow label="Total difference">
        <span class="num" :class="{ 'd-cdm__bad': !zero }">{{ difference === null ? '—' : formatMoney(difference) }}</span>
      </KeyValueRow>

      <template v-if="difference !== null && !zero">
        <NoteBanner class="d-cdm__banner" variant="wait">An account and its books do not agree. Explain the difference to lock the day, or save it and close it again once the missing entry is recorded.</NoteBanner>

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
  import type { CloseBank, CloseDay } from '@/types/finance'
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

  const balances = ref<Record<number, string>>({})
  const explanation = ref('')
  const locking = ref(true)
  const submitted = ref(false)

  const mutation = useCloseDay()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const PATTERN = /^-?\d{1,14}(?:\.\d{1,4})?$/
  const typed = (id: number) => (balances.value[id] ?? '').trim()
  const isValid = (id: number) => PATTERN.test(typed(id))
  const valid = computed(() => props.day.banks.every(b => isValid(b.receivingAccountId)))
  function lineDifference (bank: CloseBank): string | null {
    return isValid(bank.receivingAccountId) ? (Number(typed(bank.receivingAccountId)) - Number(bank.books)).toFixed(4) : null
  }
  // Every line 0 and nothing unassigned: the day locks without an explanation (the Backend decides).
  const difference = computed(() => (valid.value
    ? (props.day.banks.reduce((sum, b) => sum + Number(typed(b.receivingAccountId)), 0) - Number(props.day.books.bank)).toFixed(4)
    : null))
  const zero = computed(() => valid.value && Number(props.day.notAssigned) === 0 && props.day.banks.every(b => Number(lineDifference(b)) === 0))

  function bankLabel (bank: CloseBank): string {
    return `${bank.label}${bank.bankName && bank.bankName !== bank.label ? ` · ${bank.bankName}` : ''}${bank.isActive ? '' : ' (not in use)'}`
  }
  function balanceMessage (id: number): string | undefined {
    return (submitted.value && !isValid(id) ? 'Write the balance in EGP, for example 3142880 or 3142880.50.' : undefined) ?? fieldError(mutation.error.value, 'bank_balances')
  }
  const explanationMessage = computed(() => (submitted.value && locking.value && !zero.value ? lengthError(explanation.value, 10, 1000, 'what explains the difference') : undefined)
    ?? fieldError(mutation.error.value, 'explanation'))
  const submitError = computed(() => financeFormError(mutation.error.value))

  watch(() => [props.open, props.day.date], () => {
    balances.value = Object.fromEntries(props.day.banks.map(b => [
      b.receivingAccountId,
      props.day.close?.banks.find(l => l.receivingAccountId === b.receivingAccountId)?.statementBalance ?? '',
    ]))
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
    if (!valid.value || (lock && explanationMessage.value)) return
    const body = {
      date: props.day.date,
      balances: props.day.banks.map(b => ({ receivingAccountId: b.receivingAccountId, balance: typed(b.receivingAccountId) })),
      explanation: lock && !zero.value ? explanation.value.trim() : null,
    }
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
.d-cdm__hint { margin: 0 0 8px; }
.d-cdm__bank { border-bottom: 1px solid var(--line); margin-bottom: 8px; padding-bottom: 6px; }
.d-cdm__figures { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-3); }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
