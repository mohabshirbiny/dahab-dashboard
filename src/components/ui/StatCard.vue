<template>
  <div class="d-stat" :class="{ 'd-stat--hero': hero }">
    <div class="d-stat__k">{{ label }}</div>
    <div class="d-stat__v num" :style="valueColor ? { color: valueColor } : {}">
      <slot name="value">{{ value }}</slot>
    </div>
    <div v-if="hint" class="d-stat__s">{{ hint }}</div>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    label: string
    value?: string
    valueColor?: string
    hint?: string
    hero?: boolean
  }>()
</script>

<style lang="scss" scoped>
.d-stat {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel);
  padding: 14px 15px;
  min-width: 0;
}
.d-stat__k {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-bottom: 6px;
}
.d-stat__v {
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -.4px;
  color: var(--ink);
  line-height: 1.15;
}
.d-stat__s {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 3px;
}
.d-stat--hero {
  background: var(--nav);
  border-color: var(--nav);
  color: #fff;
}
.d-stat--hero .d-stat__k { color: #9C998D; }
.d-stat--hero .d-stat__v { font-size: 30px; }
.d-stat--hero .d-stat__s { color: #8A877C; }
</style>
