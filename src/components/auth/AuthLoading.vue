<template>
  <div class="d-authload">
    <BrandMark class="d-authload__mark" />
    <LoadingState label="Checking your session…" />
  </div>
</template>

<script lang="ts" setup>
  import BrandMark from '@/components/ui/BrandMark.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
</script>

<style lang="scss" scoped>
.d-authload {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--bg);
}
.d-authload__mark { height: 30px; width: 106px; color: var(--ink); }
</style>
