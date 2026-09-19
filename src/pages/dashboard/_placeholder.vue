<template>
  <div class="d-wip">
    <PageLead>This page will be built after the Overview prototype is approved.</PageLead>
    <div class="d-wip__box">
      <div class="d-wip__title">{{ label }}</div>
      <div class="d-wip__sub">
        The route, sidebar entry and layout are ready. The screen itself is deliberately empty until the first Dashboard/Home page is approved as the visual baseline.
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import PageLead from '@/components/ui/PageLead.vue'
  import { navGroups } from '@/mock/nav'

  const route = useRoute()
  const label = computed(() => {
    const all = navGroups.flatMap(g => g.items)
    return all.find(i => route.path.startsWith(i.to))?.title ?? 'Page'
  })
</script>

<style lang="scss" scoped>
.d-wip__box {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-panel);
  padding: 44px 20px;
  text-align: center;
}
.d-wip__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}
.d-wip__sub {
  font-size: 12.5px;
  color: var(--ink-3);
  max-width: 60ch;
  margin: 0 auto;
  line-height: 1.6;
}
</style>
