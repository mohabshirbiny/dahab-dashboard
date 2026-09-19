<template>
  <button
    :type="type"
    class="d-btn"
    :class="[`d-btn--${kind}`, { 'd-btn--block': block }]"
    :disabled="disabled"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<script lang="ts" setup>
  type Kind = 'default' | 'primary' | 'danger' | 'success'

  const props = withDefaults(defineProps<{
    kind?: Kind
    type?: 'button' | 'submit'
    block?: boolean
    disabled?: boolean
  }>(), {
    kind: 'default',
    type: 'button',
    block: false,
    disabled: false,
  })

  const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

  function onClick (ev: MouseEvent) {
    if (props.disabled) return
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
.d-btn:disabled { opacity: .55; cursor: not-allowed; }
.d-btn--block { display: flex; width: 100%; justify-content: center; }

.d-btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
.d-btn--primary:hover { background: #000; }

.d-btn--danger { color: var(--bad); border-color: #E8D5D0; }
.d-btn--danger:hover { background: #FBEFEB; }

.d-btn--success { color: var(--ok); border-color: #CFE3D7; }
.d-btn--success:hover { background: #EFF6F1; }
</style>
