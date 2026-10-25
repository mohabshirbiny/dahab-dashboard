<template>
  <Panel :title="editing ? `Edit code ${editing.code}` : 'New code'">
    <template v-if="editing" #actions>
      <DBtn @click="emit('cancel')">Cancel</DBtn>
    </template>

    <template #body>
      <form class="d-nc" novalidate @submit.prevent="onSubmit">
        <NoteBanner v-if="locked" class="d-nc__note" variant="wait">
          This code has been used, so its terms stay as they were. You can change the end date and the monthly cap, or turn it off and make a new code.
        </NoteBanner>

        <fieldset class="d-nc__terms" :disabled="locked">
          <div class="d-nc__g2">
            <FormField v-slot="{ controlId }" hint="A dealer code is for a market maker; seller and buyer codes are for one product" label="Kind of code">
              <DSelect :id="controlId" v-model="type" :options="typeOptions" />
            </FormField>

            <FormField v-if="type !== 'dealer'" v-slot="{ controlId, invalid }" :error="errors.product_type" label="Product">
              <DSelect :id="controlId" v-model="product" :invalid="invalid" :options="productOptions" />
            </FormField>
          </div>

          <div class="d-nc__g2">
            <FormField v-slot="{ controlId, invalid }" :error="errors.code" hint="Letters, numbers and dashes. People will type this." label="The code itself">
              <DInput
                :id="controlId"
                v-model="code"
                :disabled="Boolean(editing)"
                :invalid="invalid"
                placeholder="MM-KARIM"
              />
            </FormField>

            <FormField v-slot="{ controlId }" label="Who can use it">
              <DSelect :id="controlId" v-model="audience" :options="audienceOptions" />
            </FormField>
          </div>

          <div class="d-nc__g2">
            <FormField
              v-if="audience === 'account'"
              v-slot="{ controlId, invalid }"
              :error="errors.tied_to"
              hint="It will not work from any other account, on any device"
              label="Tied to"
            >
              <DInput :id="controlId" v-model="tiedTo" :invalid="invalid" placeholder="Account number or phone" />
            </FormField>

            <FormField v-slot="{ controlId }" label="Times they can use it">
              <DSelect :id="controlId" v-model="useLimit" :options="useLimitOptions" />
            </FormField>
          </div>

          <div v-if="type !== 'buyer'" class="d-nc__g3">
            <FormField v-slot="{ controlId }" label="Commission">
              <DSelect :id="controlId" v-model="mode" :options="type === 'dealer' ? modeOptions : sellerModeOptions" />
            </FormField>

            <FormField
              v-if="mode === 'percent'"
              v-slot="{ controlId, invalid }"
              :error="errors.commission_percent"
              hint="Percent, if you chose reduce"
              label="Reduce by"
            >
              <DInput
                :id="controlId"
                v-model="percent"
                inputmode="numeric"
                :invalid="invalid"
                placeholder="50"
              />
            </FormField>

            <FormField
              v-if="mode === 'amount'"
              v-slot="{ controlId, invalid }"
              :error="errors.commission_amount_egp"
              hint="EGP, VAT included"
              label="Reduce by"
            >
              <DInput
                :id="controlId"
                v-model="amount"
                inputmode="numeric"
                :invalid="invalid"
                placeholder="200"
              />
            </FormField>

            <FormField v-if="type === 'dealer'" v-slot="{ controlId }" :error="errors.gives_spread" label="Buy and sell difference">
              <DSelect :id="controlId" v-model="spread" :options="spreadOptions" />
            </FormField>
          </div>

          <div v-if="type === 'buyer'" class="d-nc__g3">
            <NoteBanner v-if="product === 'gold'" class="d-nc__note">
              The buyer pays the seller's price: the buy and sell difference is given back. The deposit does not change.
            </NoteBanner>

            <template v-else>
              <FormField v-slot="{ controlId }" label="Take off the deposit">
                <DSelect :id="controlId" v-model="depositMode" :options="depositModeOptions" />
              </FormField>

              <FormField
                v-slot="{ controlId, invalid }"
                :error="errors.deposit"
                :hint="depositMode === 'percent' ? 'Percent of the deposit' : 'EGP; the deposit never goes below 1 EGP'"
                label="Reduce by"
              >
                <DInput :id="controlId" v-model="depositValue" inputmode="numeric" :invalid="invalid" />
              </FormField>
            </template>
          </div>

          <div class="d-nc__g3">
            <FormField
              v-if="type === 'dealer'"
              v-slot="{ controlId, invalid }"
              :error="errors.min_listed_days"
              hint="Days. Zero means no wait"
              label="Piece must be listed for"
            >
              <DInput :id="controlId" v-model="listedDays" inputmode="numeric" :invalid="invalid" />
            </FormField>

            <FormField v-if="type === 'dealer'" v-slot="{ controlId }" label="Piece must be admin approved">
              <DSelect :id="controlId" v-model="approval" :options="yesNo" />
            </FormField>

            <FormField v-slot="{ controlId }" label="Starts">
              <DInput :id="controlId" v-model="startsOn" type="date" />
            </FormField>
          </div>

          <!-- Two fields the design's form does not show but its own table and the Technical Spec need (Backend spec 023 P23-3). -->
          <div v-if="type !== 'buyer'" class="d-nc__g2">
            <FormField v-slot="{ controlId }" hint="Shown as First sale only in the table" label="For a customer's first sale only">
              <DSelect :id="controlId" v-model="firstSaleOnly" :disabled="paysAdvance === 'yes'" :options="yesNo" />
            </FormField>

            <FormField v-if="type === 'dealer' || product === 'gold'" v-slot="{ controlId }" hint="Only for the first gold sale, behind the first-sale switch in commission rates" label="Also pays the first gold sale in advance">
              <DSelect :id="controlId" v-model="paysAdvance" :options="noYes" />
            </FormField>
          </div>

        </fieldset>

        <div class="d-nc__g2">
          <FormField v-slot="{ controlId, invalid }" :error="errors.monthly_cap_egp" hint="EGP of transaction value" label="Monthly cap">
            <DInput
              :id="controlId"
              v-model="cap"
              inputmode="numeric"
              :invalid="invalid"
              placeholder="500,000"
            />
          </FormField>

          <FormField v-slot="{ controlId, invalid }" :error="errors.ends_on" hint="Leave empty for no end date" label="Ends">
            <DInput :id="controlId" v-model="endsOn" :invalid="invalid" type="date" />
          </FormField>
        </div>

        <NoteBanner v-if="type !== 'buyer'" class="d-nc__note">
          The minimum commission of {{ minimum }} EGP is never broken, whatever this code says.
        </NoteBanner>

        <NoteBanner v-if="submitError" class="d-nc__note" role="alert" variant="bad">{{ submitError }}</NoteBanner>

        <DBtn kind="primary" :loading="loading" type="submit">{{ editing ? 'Save changes' : 'Create the code' }}</DBtn>
      </form>
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import type { CommissionMode, DepositMode, NewCodeInput, ProductType, PromoCodeRow, UseLimit } from '@/composables/useMarketMakers'
  import { computed, nextTick, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useSettingsQuery } from '@/composables/usePricing'
  import { trimDecimal } from '@/types/pricing'

  // The New-code form of the design (Backend spec 023 Story 5): labels, options and help texts as designed.
  // With `editing` it is the Edit form (2026-10-26): filled from the code; a used code (`in_use`) keeps its
  // terms, so only the monthly cap and the end date stay open.
  const props = defineProps<{ loading?: boolean, submitError?: string, editing?: PromoCodeRow | null }>()
  const emit = defineEmits<{ (e: 'submit', body: NewCodeInput): void, (e: 'cancel'): void }>()
  const locked = computed(() => Boolean(props.editing?.in_use))

  const audienceOptions = [{ value: 'account', label: 'One account only' }, { value: 'anyone', label: 'Anyone' }] as const
  const useLimitOptions = [
    { value: 'unlimited', label: 'No limit' }, { value: 'once', label: 'Once' }, { value: 'monthly', label: 'Once a month' },
  ] as const
  const typeOptions = [
    { value: 'dealer', label: 'Dealer (market maker)' }, { value: 'seller', label: 'Seller' }, { value: 'buyer', label: 'Buyer' },
  ] as const
  const productOptions = [
    { value: 'gold', label: 'Gold' }, { value: 'diamond', label: 'Diamond' }, { value: 'gold_with_diamond', label: 'Gold with diamond' },
  ] as const
  const sellerModeOptions = [
    { value: 'waive', label: 'Waive it entirely' }, { value: 'percent', label: 'Reduce by a percentage' }, { value: 'amount', label: 'Reduce by an amount' },
  ] as const
  const depositModeOptions = [{ value: 'percent', label: 'A percentage' }, { value: 'amount', label: 'An amount' }] as const
  const modeOptions = [
    { value: 'waive', label: 'Waive it entirely' }, { value: 'percent', label: 'Reduce by a percentage' }, { value: 'none', label: 'Leave it as it is' },
  ] as const
  const spreadOptions = [{ value: 'keep', label: 'Dahab keeps it' }, { value: 'give', label: 'Give it to them' }] as const
  const yesNo = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] as const
  const noYes = [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] as const

  const type = ref<'dealer' | 'seller' | 'buyer'>('dealer')
  const product = ref<ProductType>('gold')
  const amount = ref('')
  const depositMode = ref<Exclude<DepositMode, 'none'>>('percent')
  const depositValue = ref('')
  const code = ref('')
  const audience = ref<'account' | 'anyone'>('account')
  const tiedTo = ref('')
  const useLimit = ref<UseLimit>('unlimited')
  const mode = ref<CommissionMode>('waive')
  const percent = ref('')
  const spread = ref<'keep' | 'give'>('keep')
  const listedDays = ref('7')
  const approval = ref<'yes' | 'no'>('yes')
  const cap = ref('')
  const startsOn = ref('')
  const endsOn = ref('')
  const firstSaleOnly = ref<'yes' | 'no'>('no')
  const paysAdvance = ref<'yes' | 'no'>('no')
  const errors = ref<Record<string, string>>({})

  // Filling the form from a code must not trigger the defaults below.
  let filling = false

  // A dealer code is for one account; seller and buyer codes are for anyone unless the staff member narrows them.
  watch(type, t => {
    if (filling) return
    audience.value = t === 'dealer' ? 'account' : 'anyone'
    mode.value = 'waive'
    if (t !== 'dealer') paysAdvance.value = 'no'
  })
  watch(product, p => {
    if (filling) return
    if (p !== 'gold') paysAdvance.value = 'no'
  })

  // The Edit form starts from the code as it is.
  watch(() => props.editing, async c => {
    if (!c) return
    filling = true
    const w = c.what_it_does
    type.value = c.kind === 'market_maker' ? 'dealer' : (c.kind === 'buyer' || c.side === 'buyer' ? 'buyer' : 'seller')
    product.value = c.product_type ?? 'gold'
    code.value = c.code
    audience.value = c.tied_to.audience
    tiedTo.value = c.tied_to.audience === 'account' ? c.tied_to.customer.display_ref : ''
    useLimit.value = c.conditions.use_limit
    mode.value = w.commission.mode === 'none' && c.kind !== 'market_maker' ? 'waive' : w.commission.mode
    percent.value = w.commission.percent === null ? '' : String(Number(w.commission.percent))
    amount.value = w.commission.amount_egp ? String(Number(w.commission.amount_egp)) : ''
    spread.value = w.gives_spread ? 'give' : 'keep'
    depositMode.value = w.deposit?.mode === 'amount' ? 'amount' : 'percent'
    depositValue.value = w.deposit?.mode === 'amount' ? String(Number(w.deposit.amount_egp)) : (w.deposit?.mode === 'percent' ? String(Number(w.deposit.percent)) : '')
    listedDays.value = c.conditions.min_listed_days === null ? '' : String(c.conditions.min_listed_days)
    approval.value = c.conditions.requires_approval === false ? 'no' : 'yes'
    cap.value = c.monthly_cap_egp === null ? '' : String(Number(c.monthly_cap_egp))
    startsOn.value = c.conditions.starts_on ?? ''
    endsOn.value = c.conditions.ends_on ?? ''
    firstSaleOnly.value = c.first_sale_only ? 'yes' : 'no'
    paysAdvance.value = w.pays_advance ? 'yes' : 'no'
    errors.value = {}
    await nextTick()
    filling = false
  }, { immediate: true })

  // The note quotes the live minimum, not a literal.
  const settings = useSettingsQuery()
  const minimum = computed(() => {
    const s = settings.data.value?.find(x => x.key === 'commission.minimum_egp')
    return s ? trimDecimal(String(s.value)) : '—'
  })

  function validate (): boolean {
    const e: Record<string, string> = {}
    if (locked.value) {
      if (cap.value.trim() !== '' && !(Number(cap.value.replaceAll(',', '')) > 0)) e.monthly_cap_egp = 'An amount above 0.'
      if (startsOn.value && endsOn.value && endsOn.value < startsOn.value) e.ends_on = 'Not before the start.'
      errors.value = e
      return Object.keys(e).length === 0
    }
    if (!/^[A-Z0-9-]{3,32}$/i.test(code.value.trim())) e.code = 'Letters, numbers and dashes, 3 to 32 characters.'
    if (audience.value === 'account' && tiedTo.value.trim() === '') e.tied_to = 'Enter the account number or phone.'
    if (type.value !== 'buyer' && mode.value === 'percent') {
      const p = Number(percent.value)
      if (!(p > 0 && p < 100)) e.commission_percent = 'A percentage above 0 and below 100.'
    }
    if (type.value !== 'buyer' && mode.value === 'amount' && !(Number(amount.value.replaceAll(',', '')) > 0)) {
      e.commission_amount_egp = 'An amount above 0.'
    }
    if (type.value === 'buyer' && product.value !== 'gold') {
      const v = Number(depositValue.value.replaceAll(',', ''))
      if (!(v > 0) || (depositMode.value === 'percent' && v >= 100)) {
        e.deposit = depositMode.value === 'percent' ? 'A percentage above 0 and below 100.' : 'An amount above 0.'
      }
    }
    if (type.value === 'dealer' && listedDays.value.trim() !== '' && !/^\d{1,4}$/.test(listedDays.value.trim())) e.min_listed_days = 'A whole number of days.'
    if (cap.value.trim() !== '' && !(Number(cap.value.replaceAll(',', '')) > 0)) e.monthly_cap_egp = 'An amount above 0.'
    if (startsOn.value && endsOn.value && endsOn.value < startsOn.value) e.ends_on = 'Not before the start.'
    errors.value = e
    return Object.keys(e).length === 0
  }

  function onSubmit () {
    if (!validate()) return
    const body: NewCodeInput = {
      code: code.value.trim(),
      audience: audience.value,
      use_limit: useLimit.value,
      first_sale_only: type.value !== 'buyer' && (firstSaleOnly.value === 'yes' || paysAdvance.value === 'yes'),
      pays_advance: type.value !== 'buyer' && paysAdvance.value === 'yes',
    }
    if (type.value === 'dealer') {
      body.commission_mode = mode.value
      body.gives_spread = spread.value === 'give'
      body.requires_approval = approval.value === 'yes'
    } else {
      body.side = type.value
      body.product_type = product.value
      if (type.value === 'buyer') {
        body.kind = 'buyer'
        if (product.value !== 'gold') {
          const v = depositValue.value.replaceAll(',', '').trim()
          if (depositMode.value === 'percent') body.deposit_percent = v
          else body.deposit_amount_egp = v
        }
      } else {
        body.commission_mode = mode.value
      }
    }
    if (audience.value === 'account') body.tied_to = tiedTo.value.trim()
    if (type.value !== 'buyer' && mode.value === 'percent') body.commission_percent = percent.value.trim()
    if (type.value !== 'buyer' && mode.value === 'amount') body.commission_amount_egp = amount.value.replaceAll(',', '').trim()
    if (type.value === 'dealer' && listedDays.value.trim() !== '') body.min_listed_days = listedDays.value.trim()
    if (cap.value.trim() !== '') body.monthly_cap_egp = cap.value.replaceAll(',', '').trim()
    if (startsOn.value) body.starts_on = startsOn.value
    if (endsOn.value) body.ends_on = endsOn.value
    emit('submit', body)
  }
</script>

<style lang="scss" scoped>
.d-nc { padding: 16px; }
.d-nc__terms { border: 0; margin: 0; padding: 0; min-width: 0; }
.d-nc__terms:disabled { opacity: .6; }
.d-nc__g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.d-nc__g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.d-nc__note { margin: 4px 0 14px; }
@media (max-width: 640px) {
  .d-nc__g2, .d-nc__g3 { grid-template-columns: 1fr; }
}
</style>
