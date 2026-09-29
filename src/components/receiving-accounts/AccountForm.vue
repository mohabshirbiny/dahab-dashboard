<template>
  <DModal
    :max-width="560"
    :model-value="modelValue"
    :persistent="loading"
    :title="account ? `Edit ${account.label}` : 'Add a receiving account'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-af__lead">Customers copy these details into their bank or wallet app. A wrong digit sends their money to the wrong place, so check them twice. Every change is logged with your name.</p>

    <form id="receiving-account-form" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId }" :hint="account ? 'An account\'s method never changes; add a new account instead.' : undefined" label="Method">
        <DSelect :id="controlId" v-model="method" :disabled="loading || account !== null" :options="METHOD_OPTIONS" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('label')" hint="Staff-facing name, e.g. CIB main" label="Name">
        <DInput
          :id="controlId"
          v-model="form.label"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="80"
        />
      </FormField>

      <template v-if="method === 'bank_transfer'">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('bankName')" label="Bank">
          <DInput
            :id="controlId"
            v-model="form.bankName"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="80"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('accountHolder')" label="Account holder">
          <DInput
            :id="controlId"
            v-model="form.accountHolder"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="120"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('accountNumber')" hint="Digits and spaces, 6 to 34" label="Account number">
          <DInput
            :id="controlId"
            v-model="form.accountNumber"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
            :maxlength="34"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('iban')" hint="Optional. EG followed by 27 digits" label="IBAN">
          <DInput
            :id="controlId"
            v-model="form.iban"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="29"
          />
        </FormField>
      </template>

      <FormField
        v-if="method === 'instapay'"
        v-slot="{ controlId, describedBy, invalid }"
        :error="err('instapayAddress')"
        hint="e.g. dahab@instapay"
        label="InstaPay address"
      >
        <DInput
          :id="controlId"
          v-model="form.instapayAddress"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="120"
        />
      </FormField>

      <FormField
        v-if="method === 'vodafone_cash'"
        v-slot="{ controlId, describedBy, invalid }"
        :error="err('walletNumber')"
        hint="11 digits, e.g. 01012345678"
        label="Wallet number"
      >
        <DInput
          :id="controlId"
          v-model="form.walletNumber"
          :describedby="describedBy"
          :disabled="loading"
          inputmode="numeric"
          :invalid="invalid"
          :maxlength="11"
        />
      </FormField>

      <FormField
        v-if="method !== 'bank_transfer'"
        v-slot="{ controlId, describedBy, invalid }"
        :error="err('accountHolder')"
        hint="Optional"
        label="Account holder"
      >
        <DInput
          :id="controlId"
          v-model="form.accountHolder"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="120"
        />
      </FormField>

      <div class="d-af__two">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('dailyLimit')" hint="Shown only; never checked" label="Daily limit (EGP)">
          <DInput
            :id="controlId"
            v-model="form.dailyLimit"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
            :maxlength="16"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('providerFeePercent')" hint="Shown only, e.g. 0.5" label="Provider fee %">
          <DInput
            :id="controlId"
            v-model="form.providerFeePercent"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
            :maxlength="7"
          />
        </FormField>
      </div>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('customerNote')" label="Note customers see">
        <DTextarea
          :id="controlId"
          v-model="form.customerNote"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="300"
          placeholder="e.g. The fee is charged by InstaPay, not by Dahab."
          :rows="2"
        />
      </FormField>

      <div class="d-af__two">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('sortOrder')" hint="Lower comes first" label="Order">
          <DInput
            :id="controlId"
            v-model="form.sortOrder"
            :describedby="describedBy"
            :disabled="loading"
            inputmode="numeric"
            :invalid="invalid"
            :maxlength="3"
          />
        </FormField>

        <label class="d-af__check">
          <input v-model="form.isActive" :disabled="loading" type="checkbox">
          Shown to customers
        </label>
      </div>
    </form>

    <NoteBanner v-if="submitError" class="d-af__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="receiving-account-form" kind="primary" :loading="loading" type="submit">{{ account ? 'Save' : 'Add account' }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { ReceivingAccount, ReceivingAccountInput, TopUpMethod } from '@/types/topup'
  import { reactive, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { TOPUP_METHOD_LABELS } from '@/types/topup'

  const METHOD_OPTIONS = (Object.keys(TOPUP_METHOD_LABELS) as TopUpMethod[]).map(value => ({ value, label: TOPUP_METHOD_LABELS[value] }))

  const props = defineProps<{
    modelValue: boolean
    account: ReceivingAccount | null
    loading?: boolean
    submitError?: string
    // Backend validation messages by Backend field name (snake_case).
    fieldErrors?: Record<string, string[]>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'save', payload: { method: TopUpMethod, values: ReceivingAccountInput }): void
  }>()

  type Field = 'label' | 'bankName' | 'accountHolder' | 'accountNumber' | 'iban' | 'instapayAddress' | 'walletNumber' | 'dailyLimit' | 'providerFeePercent' | 'customerNote' | 'sortOrder'
  const BACKEND: Record<Field, string> = {
    label: 'label', bankName: 'bank_name', accountHolder: 'account_holder', accountNumber: 'account_number', iban: 'iban',
    instapayAddress: 'instapay_address', walletNumber: 'wallet_number', dailyLimit: 'daily_limit',
    providerFeePercent: 'provider_fee_percent', customerNote: 'customer_note', sortOrder: 'sort_order',
  }

  const method = ref<TopUpMethod>('bank_transfer')
  const form = reactive({
    label: '', bankName: '', accountHolder: '', accountNumber: '', iban: '', instapayAddress: '', walletNumber: '',
    dailyLimit: '', providerFeePercent: '', customerNote: '', sortOrder: '0', isActive: true,
  })
  const local = ref<Partial<Record<Field, string>>>({})

  const err = (field: Field) => local.value[field] ?? props.fieldErrors?.[BACKEND[field]]?.[0]

  watch(() => props.modelValue, open => {
    if (!open) return
    const a = props.account
    method.value = a?.method ?? 'bank_transfer'
    Object.assign(form, {
      label: a?.label ?? '', bankName: a?.bankName ?? '', accountHolder: a?.accountHolder ?? '', accountNumber: a?.accountNumber ?? '',
      iban: a?.iban ?? '', instapayAddress: a?.instapayAddress ?? '', walletNumber: a?.walletNumber ?? '',
      dailyLimit: a?.dailyLimit ? String(Number(a.dailyLimit)) : '', providerFeePercent: a?.providerFeePercent ? String(Number(a.providerFeePercent)) : '',
      customerNote: a?.customerNote ?? '', sortOrder: String(a?.sortOrder ?? 0), isActive: a?.isActive ?? true,
    })
    local.value = {}
  })

  const blank = (v: string) => (v.trim() === '' ? null : v.trim())

  // UX checks only; the Backend enforces the same rules (and the database CHECK).
  function check (): Partial<Record<Field, string>> {
    const e: Partial<Record<Field, string>> = {}
    if (form.label.trim() === '') e.label = 'Give it a name.'
    if (method.value === 'bank_transfer') {
      if (form.bankName.trim() === '') e.bankName = 'Required for a bank account.'
      if (form.accountHolder.trim() === '') e.accountHolder = 'Required for a bank account.'
      if (!/^[0-9 ]{6,34}$/.test(form.accountNumber.trim())) e.accountNumber = 'Digits and spaces, 6 to 34.'
      if (form.iban.trim() !== '' && !/^EG\d{27}$/.test(form.iban.trim())) e.iban = 'EG followed by 27 digits.'
    }
    if (method.value === 'instapay' && form.instapayAddress.trim() === '') e.instapayAddress = 'Required for InstaPay.'
    if (method.value === 'vodafone_cash' && !/^01[0125]\d{8}$/.test(form.walletNumber.trim())) e.walletNumber = 'An Egyptian mobile number, e.g. 01012345678.'
    if (form.dailyLimit.trim() !== '' && !(/^\d{1,12}(?:\.\d{1,2})?$/.test(form.dailyLimit.trim()) && Number(form.dailyLimit) > 0)) e.dailyLimit = 'An amount above 0.'
    if (form.providerFeePercent.trim() !== '' && !(/^\d{1,3}(?:\.\d{1,3})?$/.test(form.providerFeePercent.trim()) && Number(form.providerFeePercent) <= 100)) e.providerFeePercent = 'From 0 to 100.'
    if (!/^\d{1,3}$/.test(form.sortOrder.trim())) e.sortOrder = '0 to 999.'
    return e
  }

  function onSubmit () {
    if (props.loading) return
    local.value = check()
    if (Object.keys(local.value).length > 0) return
    const bank = method.value === 'bank_transfer'
    emit('save', {
      method: method.value,
      values: {
        label: form.label.trim(),
        bankName: bank ? blank(form.bankName) : null,
        accountHolder: blank(form.accountHolder),
        accountNumber: bank ? blank(form.accountNumber) : null,
        iban: bank ? blank(form.iban) : null,
        instapayAddress: method.value === 'instapay' ? blank(form.instapayAddress) : null,
        walletNumber: method.value === 'vodafone_cash' ? blank(form.walletNumber) : null,
        dailyLimit: blank(form.dailyLimit),
        providerFeePercent: blank(form.providerFeePercent),
        customerNote: blank(form.customerNote),
        sortOrder: Number(form.sortOrder.trim()),
        isActive: form.isActive,
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-af__lead { margin: 0 0 12px; font-size: 12.5px; color: var(--ink-2); }
.d-af__two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: end; }
.d-af__check { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding-bottom: 14px; }
.d-af__banner { margin-top: 10px; }
</style>
