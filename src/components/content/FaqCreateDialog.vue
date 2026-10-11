<template>
  <DModal
    :max-width="680"
    :model-value="modelValue"
    :persistent="busy"
    title="Add a Help question"
    @update:model-value="emit('update:model-value', $event)"
  >
    <form id="faq-create-form" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('slug')" hint="Lowercase letters, numbers and underscores. It names the entry and never changes." label="Name">
        <DInput
          :id="controlId"
          v-model="slug"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          placeholder="how_to_sell"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('question_en')" label="Question, English">
        <DInput
          :id="controlId"
          v-model="questionEn"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('question_ar')" label="Question, Arabic">
        <DInput
          :id="controlId"
          v-model="questionAr"
          class="d-fc__ar"
          :describedby="describedBy"
          dir="rtl"
          :disabled="busy"
          :invalid="invalid"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('answer_en')" label="Answer, English">
        <DTextarea
          :id="controlId"
          v-model="answerEn"
          :describedby="describedBy"
          :disabled="busy"
          :invalid="invalid"
          :rows="4"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy, invalid }" :error="err('answer_ar')" label="Answer, Arabic">
        <DTextarea
          :id="controlId"
          v-model="answerAr"
          class="d-fc__ar"
          :describedby="describedBy"
          dir="rtl"
          :disabled="busy"
          :invalid="invalid"
          :rows="4"
        />
      </FormField>

      <label class="d-fc__hidden">
        <input v-model="hidden" :disabled="busy" type="checkbox">
        Keep it hidden from customers when published
      </label>
    </form>

    <NoteBanner class="d-fc__note" variant="info">
      The question is saved as a draft and added to the end of the list. Customers see it after you publish. Numbers the system owns can be written as {braces}, such as {commission_gold_pct}.
    </NoteBanner>

    <NoteBanner v-if="submitError" class="d-fc__note" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="busy" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="faq-create-form" kind="primary" :loading="busy" type="submit">Save as draft</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import type { CreateFaqInput } from '@/types/content'
  import { ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'

  const props = defineProps<{
    modelValue: boolean
    busy?: boolean
    submitError?: string
    // Backend validation messages by Backend field name (snake_case).
    fieldErrors?: Record<string, string[]>
  }>()

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'save', payload: CreateFaqInput): void
  }>()

  const slug = ref('')
  const questionEn = ref('')
  const questionAr = ref('')
  const answerEn = ref('')
  const answerAr = ref('')
  const hidden = ref(false)
  const local = ref<Record<string, string>>({})

  const err = (field: string) => local.value[field] ?? props.fieldErrors?.[field]?.[0]

  watch(() => props.modelValue, open => {
    if (!open) return
    slug.value = ''
    questionEn.value = ''
    questionAr.value = ''
    answerEn.value = ''
    answerAr.value = ''
    hidden.value = false
    local.value = {}
  })

  // UX checks only; the Backend enforces the same rules and says which one failed.
  function onSubmit () {
    const e: Record<string, string> = {}
    if (!/^[a-z0-9_]{2,40}$/.test(slug.value)) e.slug = 'Use 2 to 40 lowercase letters, numbers or underscores.'
    if (questionEn.value.trim() === '') e.question_en = 'Required.'
    if (questionAr.value.trim() === '') e.question_ar = 'Required.'
    if (answerEn.value.trim() === '') e.answer_en = 'Required.'
    if (answerAr.value.trim() === '') e.answer_ar = 'Required.'
    local.value = e
    if (Object.keys(e).length > 0) return
    emit('save', {
      slug: slug.value,
      questionEn: questionEn.value.trim(),
      questionAr: questionAr.value.trim(),
      answerEn: answerEn.value.trim(),
      answerAr: answerAr.value.trim(),
      isHidden: hidden.value,
    })
  }
</script>

<style lang="scss" scoped>
.d-fc__ar { text-align: right; }
.d-fc__note { margin-top: 12px; }
.d-fc__hidden { display: flex; gap: 8px; align-items: center; margin-top: 8px; font-size: 13px; }
</style>
