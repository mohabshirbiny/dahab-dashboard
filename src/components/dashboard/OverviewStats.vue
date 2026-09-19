<template>
  <div class="d-ovstats">
    <StatCard
      hero
      :label="hero.label"
      :value="hero.value"
      :value-color="hero.valueColor"
      :hint="hero.hint"
    />
    <StatCard
      v-for="s in stats"
      :key="s.label"
      :label="s.label"
      :value="s.value"
      :value-color="s.valueColor"
      :hint="s.hint"
    />
  </div>
</template>

<script lang="ts" setup>
  import StatCard from '@/components/ui/StatCard.vue'
  import type { OverviewHeroStat, OverviewStat } from '@/types/overview'

  defineProps<{
    hero: OverviewHeroStat
    stats: OverviewStat[]
  }>()
</script>

<style lang="scss" scoped>
.d-ovstats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.d-ovstats :deep(.d-stat--hero) {
  grid-column: span 2;
}
@media (max-width: 1100px) {
  .d-ovstats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .d-ovstats { grid-template-columns: 1fr; gap: 10px; }
  .d-ovstats :deep(.d-stat--hero) { grid-column: span 1; }
}
</style>
