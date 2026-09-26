<template>
  <DModal
    :model-value="modelValue"
    :persistent="loading"
    :title="title"
    @update:model-value="emit('update:model-value', $event)"
  >
    <p class="d-confirm__text"><slot>{{ message }}</slot></p>
    <NoteBanner v-if="error" class="d-confirm__error" role="alert" variant="bad">{{ error }}</NoteBanner>

    <template #actions>
      <DBtn :disabled="loading" @click="emit('update:model-value', false)">{{ cancelLabel }}</DBtn>
      <DBtn :kind="confirmKind" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</DBtn>
    </template>
  </DModal>
</template>

<script lang="ts" setup>
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'

  withDefaults(defineProps<{
    modelValue: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmKind?: 'primary' | 'success' | 'danger'
    loading?: boolean
    error?: string
  }>(), {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmKind: 'primary',
    loading: false,
  })

  const emit = defineEmits<{
    (e: 'update:model-value', value: boolean): void
    (e: 'confirm'): void
  }>()
</script>

<style lang="scss" scoped>
.d-confirm__text { margin: 0; color: var(--ink-2); }
.d-confirm__error { margin-top: 12px; }
</style>
