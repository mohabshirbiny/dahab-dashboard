<template>
  <Panel title="Pay compensation">
    <form class="d-pcf" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId }" label="Wallet">
        <DInput
          :id="controlId"
          v-model="lookup"
          :disabled="busy"
          :maxlength="40"
          placeholder="Customer reference or phone"
        />
      </FormField>

      <FormField v-if="matches.length > 0" v-slot="{ controlId }" :error="customerError" label="Customer">
        <DSelect :id="controlId" v-model="customerId" :disabled="busy" :options="matches" />
      </FormField>

      <p v-else-if="lookup.trim().length > 2 && !search.isFetching.value" class="who2">No verified customer matches this.</p>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="amountMessage" label="Amount in EGP">
        <DInput
          :id="controlId"
          v-model="amount"
          :describedby="describedBy"
          :disabled="busy"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="17"
        />
      </FormField>

      <FormField v-slot="{ controlId }" label="Reason">
        <DSelect :id="controlId" v-model="reason" :disabled="busy" :options="COMPENSATION_REASONS" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="noteMessage" label="Note for the record">
        <DTextarea
          :id="controlId"
          v-model="note"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="1000"
          :rows="3"
        />
      </FormField>

      <KeyValueRow label="Approved by">{{ myName }}</KeyValueRow>
      <KeyValueRow label="Your remaining limit today">{{ caps ? (caps.uncapped ? 'No limit' : `${formatMoney(caps.leftToday)} EGP`) : '—' }}</KeyValueRow>

      <NoteBanner v-if="submitError" class="d-pcf__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

      <DBtn
        block
        :disabled="customerId === ''"
        kind="primary"
        :loading="busy"
        type="submit"
      >Pay into the wallet</DBtn>

      <p class="who2">Logged with your name. The customer sees it on their statement as compensation from Dahab.</p>
    </form>
  </Panel>
</template>

<script lang="ts" setup>
  import type { CompensationCaps, CompensationReason } from '@/types/finance'
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useCustomerSearchQuery } from '@/composables/useCustomerFile'
  import { usePayCompensation } from '@/composables/useFinance'
  import { formatMoney } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useToast } from '@/composables/useToast'
  import { useAuthStore } from '@/stores/auth'
  import { COMPENSATION_REASONS } from '@/types/finance'
  import { amountError, financeFormError, lengthError } from './financeErrors'

  // Pay compensation outside a dispute (Backend spec 015 FR-004, compensation.pay): the
  // same caps as inside a dispute; the Backend checks them and answers with the figures.
  defineProps<{ caps: CompensationCaps | null }>()

  const auth = useAuthStore()
  const myName = computed(() => auth.user?.name ?? '—')

  // The search runs 300 ms after the last key.
  const lookup = ref('')
  const term = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(lookup, value => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      term.value = value.trim().length > 2 ? value.trim() : ''
    }, 300)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  const search = useCustomerSearchQuery(term)
  const matches = computed(() => (search.data.value ?? [])
    .filter(c => c.status === 'active' || c.status === 'suspended')
    .map(c => ({ value: c.id, label: `${c.displayRef} · ${c.fullName ?? c.phone}` })))

  const customerId = ref('')
  const amount = ref('')
  const reason = ref<CompensationReason>('wasted_trip')
  const note = ref('')
  const submitted = ref(false)

  watch(matches, list => {
    if (!list.some(m => m.value === customerId.value)) customerId.value = list[0]?.value ?? ''
  })

  const mutation = usePayCompensation()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const amountMessage = computed(() => (submitted.value ? amountError(amount.value) : undefined) ?? fieldError(mutation.error.value, 'amount'))
  const noteMessage = computed(() => (submitted.value ? lengthError(note.value, 10, 1000, 'a note for the record') : undefined) ?? fieldError(mutation.error.value, 'note'))
  const customerError = computed(() => fieldError(mutation.error.value, 'customer_id'))
  const submitError = computed(() => financeFormError(mutation.error.value))

  async function onSubmit () {
    if (busy.value || customerId.value === '') return
    submitted.value = true
    if (amountMessage.value || noteMessage.value) return
    const body = { customerId: customerId.value, amount: amount.value.trim(), reason: reason.value, note: note.value.trim(), orderId: null }
    try {
      await mutation.mutateAsync({ body, idempotencyKey: idempotency.keyFor(body) })
      idempotency.reset()
      toast.ok(`${formatMoney(body.amount)} EGP paid into the wallet. The customer is told.`)
      amount.value = ''
      note.value = ''
      submitted.value = false
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-pcf { display: grid; gap: 4px; padding: 16px; }
.d-pcf__banner { margin: 8px 0; }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
</style>
