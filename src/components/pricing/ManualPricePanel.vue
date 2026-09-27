<template>
  <Panel subtitle="Only when the feed is down" title="Manual price">
    <template #body>
      <NoteBanner class="d-mp__note" variant="wait">
        Accepted only while the price feed is down. When the feed recovers it takes over again automatically.
        Above {{ deviationLabel }} change from the current price, someone allowed to confirm prices has to confirm it.
      </NoteBanner>

      <KeyValueRow label="Feed status">
        <StatusTag :label="feedLabel" :variant="feedVariant" />
      </KeyValueRow>

      <KeyValueRow label="Last manual price" :value="lastManualLabel" />

      <!-- Waiting for confirmation -->
      <div v-if="pending" class="d-mp__pending">
        <div class="d-mp__pendinghead">
          <StatusTag label="Waiting for confirmation" variant="wait" />
          <span class="who2">until {{ formatDateTime(pending.expiresAt) }}</span>
        </div>

        <KeyValueRow label="24K bid / ask" :value="`${formatEgp(pending.bid24k)} / ${formatEgp(pending.ask24k)}`" />
        <KeyValueRow label="Change from the current price" :value="pending.deviationPct ? `${trimDecimal(pending.deviationPct)} %` : '—'" />
        <KeyValueRow label="Entered by" :value="pending.enteredBy.fullName" />
        <KeyValueRow label="Why" :value="pending.reason" />

        <DBtn
          v-if="canConfirm"
          class="d-mp__confirm"
          :disabled="ownPending && mustDiffer"
          kind="primary"
          :loading="confirming"
          :title="ownPending && mustDiffer ? 'Someone else has to confirm a price you entered.' : undefined"
          @click="emit('confirm', pending.id)"
        >
          Confirm this price
        </DBtn>
      </div>

      <!-- Entry form -->
      <form v-if="canEnter" class="d-mp__form" novalidate @submit.prevent="onSubmit">
        <FormField v-slot="{ controlId }" label="Enter as">
          <DSelect :id="controlId" v-model="mode" :disabled="blocked" :options="modeOptions" />
        </FormField>

        <div v-if="mode === 'prices'" class="d-mp__grid">
          <FormField v-slot="{ controlId, describedBy, invalid }" :error="bidError" label="24K bid, EGP per gram">
            <DInput
              :id="controlId"
              v-model="bid"
              :describedby="describedBy"
              :disabled="blocked"
              inputmode="numeric"
              :invalid="invalid"
              :maxlength="14"
            />
          </FormField>

          <FormField v-slot="{ controlId, describedBy, invalid }" :error="askError" label="24K ask, EGP per gram">
            <DInput
              :id="controlId"
              v-model="ask"
              :describedby="describedBy"
              :disabled="blocked"
              inputmode="numeric"
              :invalid="invalid"
              :maxlength="14"
            />
          </FormField>
        </div>

        <FormField
          v-else
          v-slot="{ controlId, describedBy, invalid }"
          :error="pctError"
          hint="Applied to both the bid and the ask"
          label="Change, percent"
        >
          <DInput
            :id="controlId"
            v-model="pct"
            :describedby="describedBy"
            :disabled="blocked"
            inputmode="numeric"
            :invalid="invalid"
            :maxlength="10"
          />
        </FormField>

        <div class="d-mp__preview">
          <div class="d-mp__previewhead">
            <span>The rest follow from purity. Check them before you save.</span>
            <DBtn :disabled="blocked || !inputValid" :loading="preview.isPending.value" @click="runPreview">Preview</DBtn>
          </div>

          <template v-if="preview.data.value">
            <KeyValueRow
              v-for="k in preview.data.value.karats"
              :key="k.code"
              :class="{ 'd-mp__off': !k.isEnabled }"
              :label="`${k.code}K · sellers get / buyers pay`"
              :value="`${formatEgp(k.sellersGet)} / ${formatEgp(k.buyersPay)}`"
            />

            <p class="who2 d-mp__dev">
              Change from the current price: {{ preview.data.value.deviationPct ? `${trimDecimal(preview.data.value.deviationPct)} %` : 'first price' }}.
              Greyed karats are turned off; their price is ready if you turn them on.
            </p>
          </template>

          <NoteBanner v-if="preview.isError.value" variant="bad">{{ pricingErrorMessage(preview.error.value) }}</NoteBanner>
        </div>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" hint="For example: feed down since 11:00, price taken from the exchange by phone" label="Why you are doing this">
          <DInput
            :id="controlId"
            v-model="reason"
            :describedby="describedBy"
            :disabled="blocked"
            :invalid="invalid"
            :maxlength="REASON_MAX"
            placeholder="Required. You will read this in the log months from now."
          />
        </FormField>

        <NoteBanner v-if="submitError" class="d-mp__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

        <DBtn :disabled="blocked" :loading="submitting" type="submit">Set manual price</DBtn>
        <p v-if="feedState === 'healthy'" class="who2 d-mp__dev">The feed is healthy, so a manual price is not accepted now.</p>
      </form>
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import type { FeedState, GoldPrice, ManualPrice, PriceInput } from '@/types/pricing'
  import type { StatusVariant } from '@/types/status'
  import { computed, ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import FormField from '@/components/ui/FormField.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDate, formatDateTime } from '@/composables/useFormatters'
  import { usePreviewPrices } from '@/composables/usePricing'
  import { DECIMAL_PATTERN, formatEgp, REASON_MAX, REASON_MIN, trimDecimal } from '@/types/pricing'
  import { pricingErrorMessage } from './pricingErrors'

  const props = defineProps<{
    feedState: FeedState
    lastManual: GoldPrice | null
    pending: ManualPrice | null
    currentUserId: string | null
    canEnter: boolean
    canConfirm: boolean
    // manualprice.confirmer_must_differ and manualprice.confirm_deviation_pct, for the UI hints only.
    mustDiffer: boolean
    deviationPct: string | null
    submitting?: boolean
    confirming?: boolean
    submitError?: string
  }>()

  const emit = defineEmits<{
    (e: 'submit', payload: { price: PriceInput, reason: string }): void
    (e: 'confirm', id: number): void
  }>()

  type Mode = 'prices' | 'percent'
  const modeOptions: Array<{ value: Mode, label: string }> = [
    { value: 'prices', label: '24K bid and ask per gram' },
    { value: 'percent', label: 'Percentage change from the last price' },
  ]
  const mode = ref<Mode>('prices')
  const bid = ref('')
  const ask = ref('')
  const pct = ref('')
  const reason = ref('')
  const submitted = ref(false)

  const preview = usePreviewPrices()

  const blocked = computed(() => props.feedState === 'healthy' || Boolean(props.submitting))
  const ownPending = computed(() => props.pending?.enteredBy.id === props.currentUserId)

  const feedLabel = computed(() => ({ healthy: 'Healthy', down: 'Down', not_configured: 'Not connected' })[props.feedState])
  const feedVariant = computed<StatusVariant>(() => ({ healthy: 'ok', down: 'bad', not_configured: 'off' } as const)[props.feedState])
  const deviationLabel = computed(() => (props.deviationPct ? `${trimDecimal(props.deviationPct)} %` : 'the set'))
  const lastManualLabel = computed(() =>
    props.lastManual ? `${formatDate(props.lastManual.effectiveAt)}, by ${props.lastManual.enteredBy?.fullName ?? '—'}` : 'None yet',
  )

  const bidError = computed(() => (submitted.value && !validPrice(bid.value) ? 'A price above 0, at most 4 decimals.' : undefined))
  const askError = computed(() => {
    if (!submitted.value) return undefined
    if (!validPrice(ask.value)) return 'A price above 0, at most 4 decimals.'
    return Number(ask.value) < Number(bid.value) ? 'The ask can\'t be below the bid.' : undefined
  })
  const pctError = computed(() =>
    submitted.value && (!DECIMAL_PATTERN.test(pct.value.trim()) || Number(pct.value) <= -100) ? 'A percentage above −100, at most 4 decimals.' : undefined,
  )
  const reasonError = computed(() =>
    submitted.value && reason.value.trim().length < REASON_MIN ? `Write at least ${REASON_MIN} characters.` : undefined,
  )

  function validPrice (v: string): boolean {
    return DECIMAL_PATTERN.test(v.trim()) && Number(v) > 0
  }

  const inputValid = computed(() => mode.value === 'prices'
    ? validPrice(bid.value) && validPrice(ask.value) && Number(ask.value) >= Number(bid.value)
    : DECIMAL_PATTERN.test(pct.value.trim()) && Number(pct.value) > -100)

  function input (): PriceInput {
    return mode.value === 'prices' ? { bid24k: bid.value.trim(), ask24k: ask.value.trim() } : { changePct: pct.value.trim() }
  }

  function runPreview () {
    if (inputValid.value) preview.mutate({ price: input() })
  }

  function onSubmit () {
    if (blocked.value) return
    submitted.value = true
    if (!inputValid.value || reasonError.value) return
    emit('submit', { price: input(), reason: reason.value.trim() })
  }

  // Cleared by the page after a successful save.
  function reset () {
    bid.value = ''
    ask.value = ''
    pct.value = ''
    reason.value = ''
    submitted.value = false
    preview.reset()
  }

  defineExpose({ reset })
</script>

<style lang="scss" scoped>
.d-mp__note { margin-bottom: 12px; }
.d-mp__pending {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  margin: 14px 0;
}
.d-mp__pendinghead { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.d-mp__confirm { margin-top: 10px; }
.d-mp__form { margin-top: 14px; }
.d-mp__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
@media (max-width: 640px) {
  .d-mp__grid { grid-template-columns: 1fr; }
}
.d-mp__preview {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 13px;
}
.d-mp__previewhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: 12px; }
.d-mp__off { color: var(--ink-3); }
.d-mp__dev { margin: 8px 0 0; }
.d-mp__banner { margin-bottom: 12px; }
</style>
