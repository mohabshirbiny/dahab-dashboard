<template>
  <div class="d-stats" :class="{ 'd-stats--four': columns === 4 }">
    <slot />
  </div>
</template>

<script lang="ts" setup>
  withDefaults(defineProps<{ columns?: 4 }>(), { columns: 4 })
</script>

<style lang="scss" scoped>
.d-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 1100px) {
  .d-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .d-stats { grid-template-columns: 1fr; gap: 10px; }
}
</style>
