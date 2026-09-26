<template>
  <div class="d-empty">
    <div class="d-empty__title">{{ title }}</div>
    <div v-if="description" class="d-empty__sub">{{ description }}</div>

    <div v-if="$slots.default" class="d-empty__action">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    title: string
    description?: string
  }>()
</script>

<style lang="scss" scoped>
.d-empty {
  padding: 44px 20px;
  text-align: center;
  color: var(--ink-3);
  font-size: 12.5px;
}
.d-empty__title { color: var(--ink); font-size: 13.5px; font-weight: 600; margin-bottom: 4px; }
.d-empty__sub { max-width: 52ch; margin: 0 auto; line-height: 1.6; }
.d-empty__action { margin-top: 14px; display: flex; justify-content: center; gap: 7px; }
</style>
