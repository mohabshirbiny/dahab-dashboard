<template>
  <DModal
    :max-width="680"
    :model-value="modelValue"
    :persistent="busy"
    :title="text ? `Edit text, ${text.area}` : 'Edit text'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <template v-if="text">
      <p class="d-te__lead">
        {{ text.description }}
        <span class="mono d-te__key">{{ text.key }}</span>
      </p>

      <NoteBanner v-if="text.defaultChangedSinceOverride" class="d-te__note" variant="wait">
        The app's own wording changed after this text was published. Check that the published text still says the right thing.
      </NoteBanner>

      <NoteBanner v-if="text.draft?.isDefaultMarker" class="d-te__note" variant="info">
        This text is waiting to go back to the app's own wording. Saving words here replaces that.
      </NoteBanner>

      <form id="app-text-form" novalidate @submit.prevent="onSave">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('text_en')" :hint="`${en.length} of ${text.maxLength}`" label="English">
          <DTextarea
            :id="controlId"
            v-model="en"
            :describedby="describedBy"
            :disabled="busy"
            :invalid="invalid"
            :rows="4"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('text_ar')" :hint="`${ar.length} of ${text.maxLength}`" label="Arabic">
          <DTextarea
            :id="controlId"
            v-model="ar"
            class="d-te__ar"
            :describedby="describedBy"
            dir="rtl"
            :disabled="busy"
            :invalid="invalid"
            :rows="4"
          />
        </FormField>
      </form>

      <div v-if="names.length > 0" class="d-te__chips">
        <span class="d-te__chips-label">Placeholders you can use</span>

        <span v-for="n in names" :key="n.name" class="d-te__chip" :class="{ 'd-te__chip--req': n.required }">
          <code>{{ braced(n.name) }}</code>
          <template v-if="n.value !== null"> now {{ n.value }}</template>
          <template v-if="n.required"> required</template>
        </span>
      </div>

      <NoteBanner class="d-te__note" variant="info">
        Text with {braces} pulls its number from settings. Never type the number in, or the words will say one thing while the system does another.
      </NoteBanner>

      <details class="d-te__default">
        <summary>The app's own wording</summary>
        <p>{{ text.default.en }}</p>
        <p dir="rtl">{{ text.default.ar }}</p>
      </details>

      <NoteBanner v-if="submitError" class="d-te__note" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </template>

    <template #actions>
      <DBtn v-if="text?.draft" :disabled="busy" @click="emit('discard')">Discard draft</DBtn>
      <DBtn v-if="text?.isOverridden && !text.draft?.isDefaultMarker" :disabled="busy" @click="emit('revert')">Use the app's own wording</DBtn>
      <DBtn :disabled="busy" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="app-text-form" kind="primary" :loading="busy" type="submit">Save draft</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { AppText, SettingPlaceholder } from '@/types/content'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'

  const props = defineProps<{
    modelValue: boolean
    text: AppText | null
    // The setting placeholders and what they say right now.
    settings: SettingPlaceholder[]
    busy?: boolean
    submitError?: string
    // Backend validation messages by Backend field name (snake_case).
    fieldErrors?: Record<string, string[]>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'save', payload: { en: string, ar: string }): void
    (e: 'discard' | 'revert'): void
  }>()

  const en = ref('')
  const ar = ref('')
  const local = ref<Record<string, string>>({})

  const err = (field: string) => local.value[field] ?? props.fieldErrors?.[field]?.[0]

  // The words shown when the dialog opens: the draft if there is one, else what is live.
  watch(() => props.modelValue, open => {
    if (!open || !props.text) return
    const t = props.text
    const live = t.published ?? t.default
    const base = t.draft && !t.draft.isDefaultMarker ? t.draft : live
    en.value = base.en
    ar.value = base.ar
    local.value = {}
  })

  // The key's own placeholders first, then the setting ones with their live value.
  const names = computed(() => {
    const t = props.text
    if (!t) return []
    const own = t.placeholders.map(name => ({ name, value: null as string | null, required: t.requiredPlaceholders.includes(name) }))
    const ownNames = new Set(t.placeholders)
    const setting = props.settings
      .filter(s => !ownNames.has(s.name))
      .map(s => ({ name: s.name, value: s.value, required: false }))
    return [...own, ...setting]
  })

  const braced = (name: string) => `{${name}}`

  // UX checks only; the Backend enforces the same rules and says which one failed.
  function onSave () {
    const e: Record<string, string> = {}
    if (en.value.trim() === '') e.text_en = 'Required.'
    if (ar.value.trim() === '') e.text_ar = 'Required.'
    local.value = e
    if (Object.keys(e).length > 0) return
    emit('save', { en: en.value.trim(), ar: ar.value.trim() })
  }
</script>

<style lang="scss" scoped>
.d-te__lead { margin: 0 0 12px; color: var(--ink-2); font-size: 13px; }
.d-te__key { display: block; margin-top: 4px; font-size: 11.5px; color: var(--ink-3); }
.d-te__note { margin-top: 12px; }
.d-te__ar { text-align: right; }
.d-te__chips { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.d-te__chips-label { font-size: 11px; color: var(--ink-3); margin-right: 4px; }
.d-te__chip {
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-chip);
  font-size: 11.5px;
  background: var(--bg);
}
.d-te__chip--req { border-color: var(--gold); }
.d-te__default { margin-top: 12px; font-size: 12px; color: var(--ink-2); }
.d-te__default summary { cursor: pointer; color: var(--ink-3); }
.d-te__default p { margin: 6px 0 0; }
</style>
