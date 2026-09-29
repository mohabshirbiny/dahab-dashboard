<template>
  <DModal
    :max-width="560"
    :model-value="modelValue"
    :persistent="busy"
    title="Credit a transfer by hand"
    @update:model-value="emit('update:model-value', $event)"
  >
    <div class="d-scroll">
      <p class="d-cb__lead">For money that reached Dahab with no notice, or without the reference. Only after you see it in Dahab's own statement.</p>

      <form v-if="customer === null" class="d-cb__find" role="search" @submit.prevent="searchTerm = term.trim()">
        <FormField v-slot="{ controlId }" label="Customer reference or phone">
          <DInput
            :id="controlId"
            v-model="term"
            autocomplete="off"
            :maxlength="32"
            placeholder="004417 or +20 10 1234 5678"
          />
        </FormField>

        <DBtn :disabled="term.trim() === ''" type="submit">Find</DBtn>
      </form>

      <template v-if="customer === null && searchTerm !== ''">
        <LoadingState v-if="results.isPending.value" label="Searching…" />
        <p v-else-if="(results.data.value ?? []).length === 0" class="who2">No customer with that reference or phone.</p>

        <div v-else class="d-cb__picks">
          <DBtn v-for="c in results.data.value" :key="c.id" @click="customer = c">
            Wallet {{ c.displayRef }}{{ c.fullName ? ` · ${c.fullName}` : '' }} · {{ CUSTOMER_STATUS_META[c.status].label }}
          </DBtn>
        </div>
      </template>

      <form v-if="customer" id="credit-by-hand-form" novalidate @submit.prevent="onSubmit">
        <div class="d-cb__who">
          <span>Wallet {{ customer.displayRef }}{{ customer.fullName ? ` · ${customer.fullName}` : '' }}</span>
          <StatusTag :label="CUSTOMER_STATUS_META[customer.status].label" :variant="CUSTOMER_STATUS_META[customer.status].variant" />
          <DBtn :disabled="busy" @click="customer = null">Change</DBtn>
        </div>

        <NoteBanner v-if="notCreditable" class="d-cb__banner" variant="bad">
          This customer is not verified, so money cannot be credited to them. Return it outside the app.
        </NoteBanner>

        <NoteBanner v-else-if="customer.status === 'suspended'" class="d-cb__banner" variant="wait">
          This customer is suspended. You may credit money that has already arrived, with the transaction reference. They still cannot add money themselves.
        </NoteBanner>

        <template v-if="!notCreditable">
          <FormField v-slot="{ controlId, describedBy, invalid }" :error="amountFieldError" label="Amount that arrived (EGP)">
            <DInput
              :id="controlId"
              v-model="amount"
              :describedby="describedBy"
              :disabled="busy"
              inputmode="numeric"
              :invalid="invalid"
              :maxlength="14"
            />
          </FormField>

          <FormField v-slot="{ controlId }" :error="fieldError(mutation.error.value, 'receiving_account_id')" label="It arrived in">
            <DSelect :id="controlId" v-model="accountId" :disabled="busy" :options="accountOptions" />
          </FormField>

          <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteError" label="How you identified the customer">
            <DTextarea
              :id="controlId"
              v-model="note"
              :describedby="describedBy"
              :disabled="busy"
              :invalid="invalid"
              :maxlength="1000"
              placeholder="Required. e.g. Phone matches 01x…8842, no reference."
              :rows="2"
            />
          </FormField>

          <FormField
            v-slot="{ controlId, describedBy, invalid }"
            :error="referenceError"
            :hint="customer.status === 'suspended' ? 'Required: the transaction reference from Dahab\'s statement.' : 'Optional: the bank or wallet transaction reference.'"
            :label="customer.status === 'suspended' ? 'Transaction reference (required)' : 'Transaction reference'"
          >
            <DInput
              :id="controlId"
              v-model="arrivalReference"
              :describedby="describedBy"
              :disabled="busy"
              :invalid="invalid"
              :maxlength="100"
            />
          </FormField>
        </template>
      </form>

      <NoteBanner v-if="submitError" class="d-cb__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </div>

    <template #actions>
      <DBtn :disabled="busy" @click="emit('update:model-value', false)">Cancel</DBtn>

      <DBtn
        v-if="customer && !notCreditable"
        form="credit-by-hand-form"
        kind="success"
        :loading="busy"
        type="submit"
      >Credit wallet</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CustomerVerification } from '@/types/customer'
  import type { ReceivingAccount } from '@/types/topup'
  import { computed, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { useCustomerSearchQuery } from '@/composables/useCustomerFile'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { useCreditByHand } from '@/composables/useTopUps'
  import { CUSTOMER_STATUS_META } from '@/types/customer'
  import { TOPUP_METHOD_LABELS } from '@/types/topup'
  import { amountError, formLevelError, plainAmount } from './transferErrors'

  // Finding the customer uses the customer search, so opening this needs customer.view too.
  const props = defineProps<{ modelValue: boolean, accounts: ReceivingAccount[] }>()
  const emit = defineEmits<{ (e: 'update:model-value', value: boolean): void }>()

  const mutation = useCreditByHand()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const term = ref('')
  const searchTerm = ref('')
  const results = useCustomerSearchQuery(searchTerm)
  const customer = ref<CustomerVerification | null>(null)

  const amount = ref('')
  const accountId = ref('')
  const note = ref('')
  const arrivalReference = ref('')
  const submitted = ref(false)

  // The Backend decides; the suspended customer's pre-suspension state is not in the search result,
  // so a suspended-from-waiting customer is refused by the Backend (verification_required).
  const notCreditable = computed(() => customer.value !== null && (customer.value.status === 'pending_verification' || customer.value.status === 'rejected'))

  // Every account, inactive ones too: the money may have reached an old account.
  const accountOptions = computed(() => props.accounts.map(a => ({
    value: String(a.id),
    label: `${TOPUP_METHOD_LABELS[a.method]} · ${a.label}${a.isActive ? '' : ' (inactive)'}`,
  })))

  const amountFieldError = computed(() => (submitted.value ? amountError(amount.value) : undefined) ?? fieldError(mutation.error.value, 'amount'))
  const noteError = computed(() => (submitted.value && note.value.trim() === '' ? 'Say how you identified the customer.' : undefined) ?? fieldError(mutation.error.value, 'note'))
  const referenceError = computed(() => (submitted.value && customer.value?.status === 'suspended' && arrivalReference.value.trim() === '' ? 'Required for a suspended customer.' : undefined) ?? fieldError(mutation.error.value, 'arrival_reference'))
  const submitError = computed(() => formLevelError(mutation.error.value))

  watch(() => props.modelValue, open => {
    if (!open) return
    term.value = ''
    searchTerm.value = ''
    customer.value = null
    amount.value = ''
    accountId.value = String(props.accounts.find(a => a.isActive)?.id ?? props.accounts[0]?.id ?? '')
    note.value = ''
    arrivalReference.value = ''
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  async function onSubmit () {
    if (busy.value || customer.value === null || notCreditable.value) return
    submitted.value = true
    if (amountFieldError.value || noteError.value || referenceError.value || accountId.value === '') return

    const input = {
      customerId: customer.value.id,
      amount: plainAmount(amount.value),
      receivingAccountId: Number(accountId.value),
      note: note.value.trim(),
      arrivalReference: arrivalReference.value.trim() === '' ? null : arrivalReference.value.trim(),
    }
    try {
      await mutation.mutateAsync({ ...input, idempotencyKey: idempotency.keyFor(input) })
      idempotency.reset()
      toast.ok(`Credited ${input.amount} EGP by hand. Logged with your name.`)
      emit('update:model-value', false)
    } catch {
      // Shown in the dialog; a retry of the same input reuses the same key.
    }
  }
</script>

<style lang="scss" scoped>
// The shared DModal does not limit its height yet: the body scrolls here so the
// title and the actions stay on screen.
.d-scroll { max-height: calc(100vh - 190px); max-height: calc(100dvh - 190px); overflow-y: auto; overscroll-behavior: contain; margin: -4px -8px; padding: 4px 8px; }
.d-cb__lead { margin: 0 0 12px; font-size: 12.5px; color: var(--ink-2); }
.d-cb__find { display: flex; align-items: flex-end; gap: 8px; }
.d-cb__picks { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.d-cb__who { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 12.5px; }
.d-cb__banner { margin-bottom: 12px; }
</style>
