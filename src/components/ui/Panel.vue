<template>
  <section class="d-panel">
    <header v-if="hasHeader" class="d-panel__head" :class="{ 'd-panel__head--closed': collapsible && !isOpen }">
      <button
        v-if="collapsible"
        :aria-controls="bodyId"
        :aria-expanded="isOpen"
        class="d-panel__toggle"
        type="button"
        @click="toggle"
      >
        <span aria-hidden="true" class="d-panel__chevron" :class="{ 'd-panel__chevron--open': isOpen }">›</span>
        <h2 v-if="title" class="d-panel__title">{{ title }}</h2>
        <span v-if="subtitle" class="d-panel__sub">{{ subtitle }}</span>
      </button>

      <template v-else>
        <h2 v-if="title" class="d-panel__title">{{ title }}</h2>
        <span v-if="subtitle" class="d-panel__sub">{{ subtitle }}</span>
      </template>

      <div v-if="$slots.actions" class="d-panel__actions">
        <slot name="actions" />
      </div>
    </header>

    <div v-show="isOpen" :id="bodyId">
      <div v-if="$slots.filters" class="d-panel__filters">
        <slot name="filters" />
      </div>

      <div v-if="$slots.body" class="d-panel__body">
        <slot name="body" />
      </div>

      <slot />

      <div v-if="$slots.footer" class="d-panel__foot">
        <slot name="footer" />
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
  import { computed, ref, useId, useSlots, watch } from 'vue'

  const props = withDefaults(defineProps<{
    title?: string
    subtitle?: string
    // An accordion: the header opens and closes the body. `open` is where it starts.
    collapsible?: boolean
    open?: boolean
  }>(), { collapsible: false, open: true })

  const emit = defineEmits<{ toggle: [open: boolean] }>()

  const slots = useSlots()
  const hasHeader = computed(() => Boolean(props.title || props.subtitle || slots.actions || props.collapsible))
  const bodyId = `d-panel-${useId()}`

  const opened = ref(props.open)
  watch(() => props.open, value => {
    opened.value = value
  })
  const isOpen = computed(() => !props.collapsible || opened.value)

  function toggle () {
    opened.value = !opened.value
    emit('toggle', opened.value)
  }
</script>

<style lang="scss" scoped>
.d-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel);
  margin-bottom: 18px;
  overflow: hidden;
}
.d-panel__head {
  padding: 13px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.d-panel__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}
.d-panel__sub {
  font-size: 11.5px;
  color: var(--ink-3);
}
.d-panel__head--closed { border-bottom: 0; }
.d-panel__toggle {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 10px;
  margin: -13px -16px;
  padding: 13px 16px;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.d-panel__toggle:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; border-radius: var(--r-panel); }
.d-panel__chevron {
  display: inline-block;
  width: 12px;
  font-size: 16px;
  line-height: 1;
  color: var(--ink-3);
  transition: transform 0.15s ease;
}
.d-panel__chevron--open { transform: rotate(90deg); }
.d-panel__actions {
  margin-left: auto;
  display: flex;
  gap: 7px;
}
.d-panel__filters {
  padding: 11px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--row-head);
}
.d-panel__body {
  padding: 16px;
}
.d-panel__foot {
  padding: 0 16px 16px;
}
</style>
