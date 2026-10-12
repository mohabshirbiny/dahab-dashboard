<template>
  <Panel title="New code">
    <template #body>
      <form class="d-nc" novalidate @submit.prevent="onSubmit">
        <div class="d-nc__g2">
          <FormField v-slot="{ controlId, invalid }" :error="errors.code" hint="Letters, numbers and dashes. People will type this." label="The code itself">
            <DInput :id="controlId" v-model="code" :invalid="invalid" placeholder="MM-KARIM" />
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

        <div class="d-nc__g3">
          <FormField v-slot="{ controlId }" label="Commission">
            <DSelect :id="controlId" v-model="mode" :options="modeOptions" />
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

          <FormField v-slot="{ controlId }" :error="errors.gives_spread" label="Buy and sell difference">
            <DSelect :id="controlId" v-model="spread" :options="spreadOptions" />
          </FormField>
        </div>

        <div class="d-nc__g3">
          <FormField v-slot="{ controlId, invalid }" :error="errors.min_listed_days" hint="Days. Zero means no wait" label="Piece must be listed for">
            <DInput :id="controlId" v-model="listedDays" inputmode="numeric" :invalid="invalid" />
          </FormField>

          <FormField v-slot="{ controlId }" label="Piece must be admin approved">
            <DSelect :id="controlId" v-model="approval" :options="yesNo" />
          </FormField>

          <FormField v-slot="{ controlId, invalid }" :error="errors.monthly_cap_egp" hint="EGP of transaction value" label="Monthly cap">
            <DInput
              :id="controlId"
              v-model="cap"
              inputmode="numeric"
              :invalid="invalid"
              placeholder="500,000"
            />
          </FormField>
        </div>

        <div class="d-nc__g2">
          <FormField v-slot="{ controlId }" label="Starts">
            <DInput :id="controlId" v-model="startsOn" type="date" />
          </FormField>

          <FormField v-slot="{ controlId, invalid }" :error="errors.ends_on" hint="Leave empty for no end date" label="Ends">
            <DInput :id="controlId" v-model="endsOn" :invalid="invalid" type="date" />
          </FormField>
        </div>

        <!-- Two fields the design's form does not show but its own table and the Technical Spec need (Backend spec 023 P23-3). -->
        <div class="d-nc__g2">
          <FormField v-slot="{ controlId }" hint="Shown as First sale only in the table" label="For a customer's first sale only">
            <DSelect :id="controlId" v-model="firstSaleOnly" :disabled="paysAdvance === 'yes'" :options="yesNo" />
          </FormField>

          <FormField v-slot="{ controlId }" hint="Only for the first gold sale, behind the first-sale switch in commission rates" label="Also pays the first gold sale in advance">
            <DSelect :id="controlId" v-model="paysAdvance" :options="noYes" />
          </FormField>
        </div>

        <NoteBanner class="d-nc__note">
          The minimum commission of {{ minimum }} EGP is never broken, whatever this code says.
        </NoteBanner>

        <NoteBanner v-if="submitError" class="d-nc__note" role="alert" variant="bad">{{ submitError }}</NoteBanner>

        <DBtn kind="primary" :loading="loading" type="submit">Create the code</DBtn>
      </form>
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import type { CommissionMode, NewCodeInput, UseLimit } from '@/composables/useMarketMakers'
  import { computed, ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useSettingsQuery } from '@/composables/usePricing'
  import { trimDecimal } from '@/types/pricing'

  // The New-code form of the design (Backend spec 023 Story 5): labels, options and help texts as designed.
  defineProps<{ loading?: boolean, submitError?: string }>()
  const emit = defineEmits<{ (e: 'submit', body: NewCodeInput): void }>()

  const audienceOptions = [{ value: 'account', label: 'One account only' }, { value: 'anyone', label: 'Anyone' }] as const
  const useLimitOptions = [
    { value: 'unlimited', label: 'No limit' }, { value: 'once', label: 'Once' }, { value: 'monthly', label: 'Once a month' },
  ] as const
  const modeOptions = [
    { value: 'waive', label: 'Waive it entirely' }, { value: 'percent', label: 'Reduce by a percentage' }, { value: 'none', label: 'Leave it as it is' },
  ] as const
  const spreadOptions = [{ value: 'keep', label: 'Dahab keeps it' }, { value: 'give', label: 'Give it to them' }] as const
  const yesNo = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] as const
  const noYes = [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] as const

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

  // The note quotes the live minimum, not a literal.
  const settings = useSettingsQuery()
  const minimum = computed(() => {
    const s = settings.data.value?.find(x => x.key === 'commission.minimum_egp')
    return s ? trimDecimal(String(s.value)) : '—'
  })

  function validate (): boolean {
    const e: Record<string, string> = {}
    if (!/^[A-Z0-9-]{3,32}$/i.test(code.value.trim())) e.code = 'Letters, numbers and dashes, 3 to 32 characters.'
    if (audience.value === 'account' && tiedTo.value.trim() === '') e.tied_to = 'Enter the account number or phone.'
    if (mode.value === 'percent') {
      const p = Number(percent.value)
      if (!(p > 0 && p < 100)) e.commission_percent = 'A percentage above 0 and below 100.'
    }
    if (listedDays.value.trim() !== '' && !/^\d{1,4}$/.test(listedDays.value.trim())) e.min_listed_days = 'A whole number of days.'
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
      commission_mode: mode.value,
      gives_spread: spread.value === 'give',
      requires_approval: approval.value === 'yes',
      first_sale_only: firstSaleOnly.value === 'yes' || paysAdvance.value === 'yes',
      pays_advance: paysAdvance.value === 'yes',
    }
    if (audience.value === 'account') body.tied_to = tiedTo.value.trim()
    if (mode.value === 'percent') body.commission_percent = percent.value.trim()
    if (listedDays.value.trim() !== '') body.min_listed_days = listedDays.value.trim()
    if (cap.value.trim() !== '') body.monthly_cap_egp = cap.value.replaceAll(',', '').trim()
    if (startsOn.value) body.starts_on = startsOn.value
    if (endsOn.value) body.ends_on = endsOn.value
    emit('submit', body)
  }
</script>

<style lang="scss" scoped>
.d-nc { padding: 16px; }
.d-nc__g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.d-nc__g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.d-nc__note { margin: 4px 0 14px; }
@media (max-width: 640px) {
  .d-nc__g2, .d-nc__g3 { grid-template-columns: 1fr; }
}
</style>
