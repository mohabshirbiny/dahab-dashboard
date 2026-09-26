<template>
  <button
    :aria-busy="loading || undefined"
    class="d-btn"
    :class="[`d-btn--${kind}`, `d-btn--${size}`, { 'd-btn--block': block, 'd-btn--loading': loading }]"
    :disabled="disabled || loading"
    :type="type"
    @click="onClick"
  >
    <span v-if="loading" aria-hidden="true" class="d-btn__spin" />
    <slot />
  </button>
</template>

<script lang="ts" setup>
  type Kind = 'default' | 'primary' | 'danger' | 'success'

  const props = withDefaults(defineProps<{
    kind?: Kind
    size?: 'md' | 'lg'
    type?: 'button' | 'submit'
    block?: boolean
    disabled?: boolean
    loading?: boolean
  }>(), {
    kind: 'default',
    size: 'md',
    type: 'button',
    block: false,
    disabled: false,
    loading: false,
  })

  const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

  function onClick (ev: MouseEvent) {
    if (props.disabled || props.loading) return
    emit('click', ev)
  }
</script>

<style lang="scss" scoped>
.d-btn {
  padding: 6px 11px;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: var(--r-btn);
  font: 500 11.5px/1.4 Inter, system-ui, sans-serif;
  color: var(--ink);
  cursor: pointer;
  white-space: nowrap;
  transition: background-color .12s ease, border-color .12s ease, color .12s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.d-btn:hover { background: var(--bg); }
.d-btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.d-btn:disabled { opacity: .55; cursor: not-allowed; }
.d-btn--loading:disabled { cursor: progress; }
.d-btn--block { display: flex; width: 100%; justify-content: center; }
.d-btn--lg { padding: 10px 16px; font-size: 13px; border-radius: var(--r-input); }

.d-btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
.d-btn--primary:hover { background: #000; }

.d-btn--danger { color: var(--bad); border-color: #E8D5D0; }
.d-btn--danger:hover { background: #FBEFEB; }

.d-btn--success { color: var(--ok); border-color: #CFE3D7; }
.d-btn--success:hover { background: #EFF6F1; }

.d-btn__spin {
  width: 11px;
  height: 11px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: d-spin .7s linear infinite;
  flex-shrink: 0;
}
@keyframes d-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .d-btn__spin { animation-duration: 1.6s; }
}
</style>
