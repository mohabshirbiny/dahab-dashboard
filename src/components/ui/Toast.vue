<template>
  <div class="d-toast" :class="{ 'd-toast--on': toast.visible }" role="status" aria-live="polite">
    {{ toast.message }}
  </div>
</template>

<script lang="ts" setup>
  import { useToastStore } from '@/stores/toast'
  const toast = useToastStore()
</script>

<style lang="scss" scoped>
.d-toast {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%) translateY(70px);
  background: var(--ink);
  color: #fff;
  padding: 11px 18px;
  border-radius: 9px;
  font-size: 12.5px;
  opacity: 0;
  transition: opacity .22s ease, transform .22s ease;
  z-index: 99;
  pointer-events: none;
  max-width: min(90vw, 460px);
  text-align: center;
}
.d-toast--on {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
