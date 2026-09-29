<template>
  <v-dialog
    :aria-labelledby="titleId"
    class="d-modal"
    :max-width="maxWidth"
    :model-value="modelValue"
    :persistent="persistent"
    scrim="rgba(23, 22, 15, 0.45)"
    @update:model-value="emit('update:model-value', $event)"
  >
    <section class="d-modal__card">
      <header class="d-modal__head">
        <h2 :id="titleId" class="d-modal__title">{{ title }}</h2>

        <button
          aria-label="Close"
          class="d-modal__close"
          :disabled="persistent"
          type="button"
          @click="emit('update:model-value', false)"
        >
          ×
        </button>
      </header>

      <div class="d-modal__body">
        <slot />
      </div>

      <footer v-if="$slots.actions" class="d-modal__foot">
        <slot name="actions" />
      </footer>
    </section>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { useId } from 'vue'

  withDefaults(defineProps<{
    modelValue: boolean
    title: string
    maxWidth?: number | string
    // Blocks Esc, outside clicks and the close button, for example while saving.
    persistent?: boolean
  }>(), { maxWidth: 480, persistent: false })

  const emit = defineEmits<{ (e: 'update:model-value', value: boolean): void }>()

  const titleId = useId()
</script>

<style lang="scss" scoped>
.d-modal__card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel);
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(23, 22, 15, .22);
  color: var(--ink);
  font-family: Inter, system-ui, sans-serif;
  // A tall form (e.g. a role's permissions) must fit the screen: the body
  // scrolls, the title and the actions stay in view.
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
}
.d-modal__head {
  flex: none;
  padding: 13px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.d-modal__title {
  font-size: 13.5px;
  font-weight: 600;
  margin: 0;
}
.d-modal__close {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: 20px;
  line-height: 1;
  width: 26px;
  height: 26px;
  border-radius: var(--r-btn);
  cursor: pointer;
}
.d-modal__close:hover:not(:disabled) { background: var(--bg); color: var(--ink); }
.d-modal__close:disabled { opacity: .4; cursor: not-allowed; }
.d-modal__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  font-size: 12.5px;
  line-height: 1.6;
}
.d-modal__foot {
  flex: none;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--row-head);
  display: flex;
  justify-content: flex-end;
  gap: 7px;
}
@media (max-width: 480px) {
  .d-modal__foot { flex-direction: column-reverse; }
  .d-modal__foot :deep(.d-btn) { width: 100%; justify-content: center; }
}
</style>
