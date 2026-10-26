<template>
  <DModal
    :max-width="560"
    :model-value="open"
    :persistent="busy"
    :title="target?.correcting ? 'Correct the result' : 'Enter the inspection result'"
    @update:model-value="close"
  >
    <form v-if="target" novalidate @submit.prevent="onSubmit">
      <p class="d-irm__lead">
        {{ target.orderRef }} · {{ target.pieceName }}.
        Stated: {{ target.statedKarat !== null ? `${target.statedKarat}K` : '—' }}<template v-if="target.statedWeightG"> · {{ formatWeight(target.statedWeightG) }} g</template>.
        A submitted result cannot be edited; a correction is a new entry and both are kept.
      </p>

      <div v-if="hasStone" class="d-irm__stone">
        <div class="d-irm__stone-title">The stone, as the seller stated it</div>
        <div>{{ stoneWords(target.stone) ?? 'No details given' }}</div>
        <div class="who2">{{ certificateWords(target.stone) ?? 'Certificate not stated' }}</div>

        <div v-if="target.certificates.length > 0" class="d-irm__files">
          <DBtn
            v-for="(file, i) in target.certificates"
            :key="file.id"
            :loading="opening === file.id"
            @click="openCertificate(file.id)"
          >{{ target.certificates.length > 1 ? `Open certificate ${i + 1}` : 'Open the certificate' }}</DBtn>
        </div>

        <div v-else class="who2">The seller uploaded no certificate file.</div>
        <div v-if="openError" class="who2 d-irm__bad">{{ openError }}</div>
      </div>

      <NoteBanner v-if="target.correcting" class="d-irm__banner" variant="wait">
        This replaces the result of {{ formatDateTime(target.correcting.inspectedAt) }} ({{ outcomeMeta(target.correcting.outcome).label }}).
      </NoteBanner>

      <div v-if="hasGold" class="d-irm__row">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="karatError" label="Measured karat">
          <DInput
            :id="controlId"
            v-model="karat"
            :describedby="describedBy"
            :disabled="busy"
            inputmode="numeric"
            :invalid="invalid"
            placeholder="21"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="weightError" label="Measured weight (g)">
          <DInput
            :id="controlId"
            v-model="weight"
            :describedby="describedBy"
            :disabled="busy"
            inputmode="numeric"
            :invalid="invalid"
            placeholder="7.620"
          />
        </FormField>
      </div>

      <div v-if="hasStone">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError(mutation.error.value, 'measured_stone_grade')" label="Measured stone grade">
          <DInput
            :id="controlId"
            v-model="grade"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :maxlength="100"
            placeholder="VS2 · G"
          />
        </FormField>
      </div>

      <label v-if="hasStone" class="d-irm__check">
        <input v-model="stoneBelow" :disabled="busy" type="checkbox">
        The stone is below what the seller claimed
      </label>

      <label class="d-irm__check">
        <input v-model="counterfeit" :disabled="busy" type="checkbox">
        The piece is not genuine
      </label>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="fieldError(mutation.error.value, 'inspector_note')" label="Inspector's note (optional)">
        <DTextarea
          :id="controlId"
          v-model="note"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :maxlength="2000"
          :rows="3"
        />
      </FormField>

      <p class="who2">Dahab works out the outcome from what you enter. No price is shown here.</p>

      <NoteBanner v-if="submitError" class="d-irm__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </form>

    <template #actions>
      <DBtn :disabled="busy" @click="close(false)">Cancel</DBtn>
      <DBtn kind="primary" :loading="busy" @click="onSubmit">Submit result</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { InspectionTarget } from '@/types/order'
  import { computed, ref, watch } from 'vue'
  import { formatWeight } from '@/components/listings/listingFormat'
  import { fieldError } from '@/components/staff/accessErrors'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { useOrderAction } from '@/composables/useOrders'
  import { useToast } from '@/composables/useToast'
  import { orderService } from '@/services/order.service'
  import { certificateWords, outcomeMeta, stoneWords } from '@/types/order'
  import { orderFormError } from './orderErrors'

  // Record an immutable inspection result (Backend spec 012 FR-011, inspection.enter).
  // The Backend derives the outcome and moves the order; the answer carries no money.
  const props = defineProps<{ open: boolean, target: InspectionTarget | null }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const mutation = useOrderAction()
  const idempotency = useIdempotencyKey()
  const toast = useToast()
  const busy = computed(() => mutation.isPending.value)

  const karat = ref('')
  const weight = ref('')
  const grade = ref('')
  const note = ref('')
  const counterfeit = ref(false)
  const stoneBelow = ref(false)
  const submitted = ref(false)

  const hasGold = computed(() => props.target !== null && props.target.category !== 'diamond')
  const hasStone = computed(() => props.target !== null && props.target.category !== 'gold')

  const karatError = computed(() => {
    if (submitted.value && hasGold.value && !/^\d{1,2}$/.test(karat.value.trim())) return 'Enter the karat as a whole number, for example 21.'
    return fieldError(mutation.error.value, 'measured_karat')
  })
  const weightError = computed(() => {
    if (submitted.value && hasGold.value && !/^\d+(?:\.\d{1,3})?$/.test(weight.value.trim())) return 'Enter the weight in grams, up to 3 decimals.'
    return fieldError(mutation.error.value, 'measured_weight_g')
  })
  const submitError = computed(() => orderFormError(mutation.error.value))

  watch(() => [props.open, props.target?.orderId], () => {
    const c = props.target?.correcting ?? null
    karat.value = c?.measuredKarat?.toString() ?? ''
    weight.value = c?.measuredWeightG ?? ''
    grade.value = c?.measuredStoneGrade ?? ''
    openError.value = ''
    note.value = ''
    counterfeit.value = c?.isCounterfeit ?? false
    stoneBelow.value = c?.stoneBelowClaim ?? false
    submitted.value = false
    mutation.reset()
    idempotency.reset()
  })

  function close (value: boolean) {
    if (!value && !busy.value) {
      emit('close')
    }
  }

  // The certificate file the seller uploaded, opened in a new tab (fetched with the staff token).
  const opening = ref<string | null>(null)
  const openError = ref('')
  async function openCertificate (mediaId: string) {
    if (!props.target) return
    opening.value = mediaId
    openError.value = ''
    try {
      const url = URL.createObjectURL(await orderService.certificate(props.target.orderId, mediaId))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      openError.value = 'The certificate could not be opened. Try again.'
    } finally {
      opening.value = null
    }
  }

  const blank = (v: string) => (v.trim() === '' ? null : v.trim())

  async function onSubmit () {
    if (busy.value || !props.target) return
    submitted.value = true
    if (karatError.value !== undefined || weightError.value !== undefined) {
      return
    }

    const input = {
      measuredKarat: hasGold.value ? Number(karat.value.trim()) : null,
      measuredWeightG: hasGold.value ? weight.value.trim() : null,
      measuredStoneGrade: hasStone.value ? blank(grade.value) : null,
      // The certificate number is no longer asked (app notes 2026-10-26): the inspector opens the file itself.
      certificateNumber: null,
      inspectorNote: blank(note.value),
      isCounterfeit: counterfeit.value,
      stoneBelowClaim: hasStone.value && stoneBelow.value,
      supersedesId: props.target.correcting?.id ?? null,
    }
    const payload = { orderId: props.target.orderId, action: { kind: 'inspect' as const, input } }
    try {
      await mutation.mutateAsync({ ...payload, idempotencyKey: idempotency.keyFor(payload) })
      idempotency.reset()
      toast.ok('Result recorded. Both sides are told.')
      emit('close')
    } catch {
      // Shown in the form.
    }
  }
</script>

<style lang="scss" scoped>
.d-irm__lead { margin: 0 0 12px; font-size: 13px; line-height: 1.6; }
.d-irm__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.d-irm__check { display: flex; gap: 8px; align-items: center; font-size: 13px; margin: 4px 0 10px; }
.d-irm__banner { margin: 8px 0 12px; }
.d-irm__stone { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin: 0 0 12px; font-size: 13px; }
.d-irm__stone-title { font-weight: 500; margin-bottom: 4px; }
.d-irm__files { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.d-irm__bad { color: var(--bad); }
.who2 { font-size: 11px; color: var(--ink-3); margin: 6px 0 0; }
@media (max-width: 600px) { .d-irm__row { grid-template-columns: 1fr; } }
</style>
