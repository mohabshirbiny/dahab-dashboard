<template>
  <DModal
    :max-width="760"
    :model-value="modelValue"
    :persistent="loading"
    :title="document ? `New version of ${document.label}` : 'New version'"
    @update:model-value="emit('update:model-value', $event)"
  >
    <template v-if="document">
      <p class="d-lv__lead">
        This becomes version {{ (document.version ?? 0) + 1 }}. The text is fixed: it never changes after you publish, and a correction is another new version.
        Both languages are required.
      </p>

      <NoteBanner v-if="gated" class="d-lv__note" variant="wait">
        Customers who have not accepted this document will be asked to accept it before they continue. Publish it only after the lawyer has approved the text and the app with the acceptance screen is live.
      </NoteBanner>

      <form id="legal-version-form" novalidate @submit.prevent="onSubmit">
        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('body_en')" label="English">
          <DTextarea
            :id="controlId"
            v-model="en"
            :describedby="describedBy"
            :disabled="loading"
            :invalid="invalid"
            :rows="9"
          />
        </FormField>

        <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('body_ar')" label="Arabic">
          <DTextarea
            :id="controlId"
            v-model="ar"
            class="d-lv__ar"
            :describedby="describedBy"
            dir="rtl"
            :disabled="loading"
            :invalid="invalid"
            :rows="9"
          />
        </FormField>

        <label class="d-lv__check">
          <input v-model="material" :disabled="loading" type="checkbox">
          This is a material change: ask customers to accept it again at their next sign-in
        </label>
      </form>

      <NoteBanner v-if="submitError" class="d-lv__note" role="alert" variant="bad">{{ submitError }}</NoteBanner>
    </template>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="legal-version-form" kind="primary" :loading="loading" type="submit">Publish version</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { LegalDocument } from '@/types/legal'
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { LEGAL_GATED_CODES } from '@/types/legal'

  const props = defineProps<{
    modelValue: boolean
    document: LegalDocument | null
    loading?: boolean
    submitError?: string
    // Backend validation messages by Backend field name (snake_case).
    fieldErrors?: Record<string, string[]>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'publish', payload: { bodyEn: string, bodyAr: string, isMaterial: boolean }): void
  }>()

  const en = ref('')
  const ar = ref('')
  const material = ref(false)
  const local = ref<Record<string, string>>({})

  const err = (field: string) => local.value[field] ?? props.fieldErrors?.[field]?.[0]
  const gated = computed(() => props.document !== null && LEGAL_GATED_CODES.includes(props.document.code))

  watch(() => props.modelValue, open => {
    if (!open) return
    en.value = ''
    ar.value = ''
    material.value = false
    local.value = {}
  })

  // UX checks only; the Backend enforces the same rules.
  function onSubmit () {
    const e: Record<string, string> = {}
    if (en.value.trim() === '') e.body_en = 'Required.'
    if (ar.value.trim() === '') e.body_ar = 'Required.'
    local.value = e
    if (Object.keys(e).length > 0) return
    emit('publish', { bodyEn: en.value.trim(), bodyAr: ar.value.trim(), isMaterial: material.value })
  }
</script>

<style lang="scss" scoped>
.d-lv__lead { margin: 0 0 12px; color: var(--ink-2); font-size: 13px; }
.d-lv__note { margin-bottom: 12px; }
.d-lv__ar { text-align: right; }
.d-lv__check { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; margin-top: 4px; }
</style>
