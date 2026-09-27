<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    :title="title"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p v-if="lead" class="d-rm__lead">{{ lead }}</p>

    <form id="pricing-reason-form" novalidate @submit.prevent="onSubmit">
      <FormField v-slot="{ controlId, describedBy, invalid }" :error="reasonError" label="Why (recorded with the change)">
        <DTextarea
          :id="controlId"
          v-model="reason"
          :describedby="describedBy"
          :disabled="loading"
          :invalid="invalid"
          :maxlength="REASON_MAX"
          :placeholder="placeholder"
          :rows="2"
        />
      </FormField>
    </form>

    <NoteBanner v-if="submitError" class="d-rm__banner" role="alert" variant="bad">{{ submitError }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">Cancel</DBtn>
      <DBtn form="pricing-reason-form" kind="primary" :loading="loading" type="submit">{{ confirmLabel }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import FormField from '@/components/ui/FormField.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { REASON_MAX, REASON_MIN } from '@/types/pricing'

  const props = withDefaults(defineProps<{
    modelValue: boolean
    title: string
    lead?: string
    placeholder?: string
    confirmLabel?: string
    loading?: boolean
    submitError?: string
  }>(), { confirmLabel: 'Save' })

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm', reason: string): void
  }>()

  const reason = ref('')
  const submitted = ref(false)

  const reasonError = computed(() =>
    submitted.value && reason.value.trim().length < REASON_MIN ? `Write at least ${REASON_MIN} characters.` : undefined,
  )

  watch(() => props.modelValue, open => {
    if (!open) return
    reason.value = ''
    submitted.value = false
  })

  function onSubmit () {
    if (props.loading) return
    submitted.value = true
    if (reasonError.value) return
    emit('confirm', reason.value.trim())
  }
</script>

<style lang="scss" scoped>
.d-rm__lead { margin: 0 0 14px; color: var(--ink-2); }
.d-rm__banner { margin-top: 12px; }
</style>
