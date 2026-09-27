<template>
  <DModal
    :max-width="640"
    :model-value="modelValue"
    :persistent="loading"
    :title="branch ? `Edit ${branch.nameEn}` : 'Add a branch'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <form id="branch-editor-form" novalidate @submit.prevent="onSubmit">
      <div class="d-be__grid">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errorFor('name_en')" label="Name (English)">
          <DInput
            :id="controlId"
            v-model="form.nameEn"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="150"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errorFor('name_ar')" label="Name (Arabic)">
          <DInput
            :id="controlId"
            v-model="form.nameAr"
            :describedby="describedBy"
            dir="rtl"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="150"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errorFor('address_en')" label="Address (English)">
          <DInput
            :id="controlId"
            v-model="form.addressEn"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="500"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="errorFor('address_ar')" label="Address (Arabic)">
          <DInput
            :id="controlId"
            v-model="form.addressAr"
            :describedby="describedBy"
            dir="rtl"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="500"
          />
        </FormField>

        <FormField
          v-slot="{ controlId, describedBy, invalid }"
          :error="errorFor('timezone')"
          hint="Deadlines are counted in this timezone."
          label="Timezone"
        >
          <DInput
            :id="controlId"
            v-model="form.timezone"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :maxlength="64"
          />
        </FormField>

        <label v-if="branch" class="d-be__check">
          <input v-model="form.isEnabled" :disabled="loading" type="checkbox">
          Open for new inspections
          <span class="who2">A disabled branch stays on past records.</span>
        </label>
      </div>

      <fieldset class="d-be__week" :disabled="loading">
        <legend class="d-be__legend">Opening hours</legend>
        <p class="d-be__hint">Add one line per open period. A day with a break gets two lines. Days with no line are closed.</p>

        <div v-for="(row, index) in form.hours" :key="row.key" class="d-be__row">
          <DSelect v-model="row.dow" :aria-label="`Day, line ${index + 1}`" :options="dayOptions" />

          <DInput
            v-model="row.opensAt"
            :aria-label="`Opens, line ${index + 1}`"
            :invalid="Boolean(rowErrors[index])"
            :maxlength="5"
            placeholder="10:00"
          />

          <span class="d-be__to">to</span>

          <DInput
            v-model="row.closesAt"
            :aria-label="`Closes, line ${index + 1}`"
            :invalid="Boolean(rowErrors[index])"
            :maxlength="5"
            placeholder="18:00"
          />

          <DBtn :aria-label="`Remove line ${index + 1}`" @click="removeRow(index)">Remove</DBtn>
          <div v-if="rowErrors[index]" class="d-be__rowerror" role="alert">{{ rowErrors[index] }}</div>
        </div>

        <DBtn class="d-be__add" @click="addRow">Add hours</DBtn>
      </fieldset>
    </form>

    <NoteBanner v-if="submitError" class="d-be__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>

      <DBtn form="branch-editor-form" kind="primary" :loading="loading" type="submit">
        {{ branch ? 'Save branch' : 'Add branch' }}
      </DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { Branch, BranchHour, BranchInput } from '@/types/reference'
  import { computed, reactive, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { DAY_NAMES, DEFAULT_TIMEZONE, TIME_PATTERN } from '@/types/reference'

  type DayValue = '0' | '1' | '2' | '3' | '4' | '5' | '6'
  interface Row { key: number, dow: DayValue, opensAt: string, closesAt: string }

  const props = defineProps<{
    modelValue: boolean
    // null = a new branch.
    branch: Branch | null
    loading?: boolean
    submitError?: string
    // Backend validation messages, by field (`name_en`, `hours.2`, …).
    fieldErrors?: Readonly<Record<string, string[]>>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', payload: BranchInput): void
  }>()

  const dayOptions = DAY_NAMES.map((label, dow) => ({ value: String(dow) as DayValue, label }))

  let nextKey = 0
  const form = reactive({
    nameEn: '',
    nameAr: '',
    addressEn: '',
    addressAr: '',
    timezone: DEFAULT_TIMEZONE,
    isEnabled: true,
    hours: [] as Row[],
  })
  const submitted = ref(false)

  function toRow (h: BranchHour): Row {
    return { key: nextKey++, dow: String(h.dow) as DayValue, opensAt: h.opensAt, closesAt: h.closesAt }
  }

  // Every opening starts from the branch as saved, or Sunday to Thursday 10:00–18:00 for a new one.
  watch(() => props.modelValue, open => {
    if (!open) return
    const b = props.branch
    form.nameEn = b?.nameEn ?? ''
    form.nameAr = b?.nameAr ?? ''
    form.addressEn = b?.addressEn ?? ''
    form.addressAr = b?.addressAr ?? ''
    form.timezone = b?.timezone ?? DEFAULT_TIMEZONE
    form.isEnabled = b?.isEnabled ?? true
    form.hours = b
      ? b.hours.map(h => toRow(h))
      : [0, 1, 2, 3, 4].map(dow => toRow({ dow, opensAt: '10:00', closesAt: '18:00' }))
    submitted.value = false
  })

  function addRow () {
    form.hours.push({ key: nextKey++, dow: '0', opensAt: '', closesAt: '' })
  }

  function removeRow (index: number) {
    form.hours.splice(index, 1)
  }

  const required = ['nameEn', 'nameAr', 'addressEn', 'addressAr', 'timezone'] as const
  const wireName: Record<typeof required[number], string> = {
    nameEn: 'name_en',
    nameAr: 'name_ar',
    addressEn: 'address_en',
    addressAr: 'address_ar',
    timezone: 'timezone',
  }

  function errorFor (field: string): string | undefined {
    if (submitted.value) {
      const key = required.find(k => wireName[k] === field)
      if (key && form[key].trim() === '') {
        return 'Required.'
      }
    }
    return props.fieldErrors?.[field]?.[0]
  }

  // Mirrors the Backend's week rules only to help while typing; the Backend decides.
  const rowErrors = computed<Array<string | undefined>>(() => {
    const errors: Array<string | undefined> = form.hours.map((row, index) => {
      const server = props.fieldErrors?.[`hours.${index}`]?.[0]
        ?? props.fieldErrors?.[`hours.${index}.opens_at`]?.[0]
        ?? props.fieldErrors?.[`hours.${index}.closes_at`]?.[0]
      if (!submitted.value) return server
      if (!TIME_PATTERN.test(row.opensAt) || !TIME_PATTERN.test(row.closesAt)) return 'Use 24-hour times like 09:30.'
      if (row.closesAt <= row.opensAt) return 'Closing time must be after opening time.'
      return server
    })
    if (!submitted.value) return errors
    const ordered = form.hours
      .map((row, index) => ({ ...row, index }))
      .filter((_, index) => errors[index] === undefined)
    ordered.sort((a, b) => (a.dow === b.dow ? a.opensAt.localeCompare(b.opensAt) : Number(a.dow) - Number(b.dow)))
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1]!
      const cur = ordered[i]!
      if (cur.dow === prev.dow && cur.opensAt < prev.closesAt) {
        errors[cur.index] = 'Overlaps another line on the same day.'
      }
    }
    return errors
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (required.some(k => form[k].trim() === '') || rowErrors.value.some(Boolean)) return
    emit('confirm', {
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim(),
      addressEn: form.addressEn.trim(),
      addressAr: form.addressAr.trim(),
      timezone: form.timezone.trim(),
      isEnabled: form.isEnabled,
      hours: form.hours.map(row => ({ dow: Number(row.dow), opensAt: row.opensAt, closesAt: row.closesAt })),
    })
  }
</script>

<style lang="scss" scoped>
.d-be__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
}
@media (max-width: 640px) {
  .d-be__grid { grid-template-columns: 1fr; }
}
.d-be__check {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  align-self: center;
  font-size: 12.5px;
  color: var(--ink);
}
.d-be__check input { accent-color: var(--gold); }
.d-be__check .who2 { flex-basis: 100%; }
.d-be__week { margin: 6px 0 0; padding: 0; border: 0; min-width: 0; }
.d-be__legend { padding: 0; margin-bottom: 4px; font-size: 12px; font-weight: 600; color: var(--ink); }
.d-be__hint { margin: 0 0 10px; font-size: 11.5px; color: var(--ink-3); }
.d-be__row {
  display: grid;
  grid-template-columns: 1.4fr 1fr auto 1fr auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.d-be__to { font-size: 12px; color: var(--ink-3); }
.d-be__rowerror { grid-column: 1 / -1; font-size: 11.5px; color: var(--bad); }
.d-be__add { margin-top: 4px; }
.d-be__banner { margin-top: 12px; }
</style>
