<template>
  <p class="d-lead">
    <slot />
  </p>
</template>

<style lang="scss" scoped>
.d-lead {
  color: var(--ink-2);
  font-size: 13px;
  margin: 0 0 18px;
  max-width: 70ch;
  line-height: 1.55;
}
</style>
