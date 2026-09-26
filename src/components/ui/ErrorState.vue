<template>
  <div class="d-error" role="alert">
    <div class="d-error__title">{{ title }}</div>
    <div v-if="message" class="d-error__sub">{{ message }}</div>

    <div v-if="$slots.default || retryable" class="d-error__action">
      <slot>
        <DBtn @click="emit('retry')">Try again</DBtn>
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import DBtn from '@/components/ui/DBtn.vue'

  withDefaults(defineProps<{
    title?: string
    message?: string
    retryable?: boolean
  }>(), {
    title: 'Something went wrong',
    retryable: true,
  })

  const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<style lang="scss" scoped>
.d-error {
  padding: 44px 20px;
  text-align: center;
  font-size: 12.5px;
  color: var(--ink-3);
}
.d-error__title { color: var(--bad); font-size: 13.5px; font-weight: 600; margin-bottom: 4px; }
.d-error__sub { max-width: 52ch; margin: 0 auto; line-height: 1.6; }
.d-error__action { margin-top: 14px; display: flex; justify-content: center; gap: 7px; }
</style>
