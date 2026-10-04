<template>
  <div class="d-pf">
    <FilterChips :model-value="preset" :options="PRESETS" @update:model-value="pick" />

    <template v-if="preset === 'custom'">
      <DInput aria-label="From" :model-value="from" type="date" @update:model-value="emit('update:from', $event)" />
      <DInput aria-label="To" :model-value="to" type="date" @update:model-value="emit('update:to', $event)" />
    </template>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import DInput from '@/components/ui/DInput.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import { cairoDate } from '@/types/audit'

  // The design's period chips (Last 30 / 60 / 90 days, This year, Custom dates), as Cairo dates.
  type Preset = '30' | '60' | '90' | 'year' | 'custom'
  const PRESETS: ReadonlyArray<{ value: Preset, label: string }> = [
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
    { value: 'year', label: 'This year' },
    { value: 'custom', label: 'Custom dates' },
  ]

  defineProps<{ from: string, to: string }>()
  const emit = defineEmits<{ (e: 'update:from' | 'update:to', value: string): void }>()

  const preset = ref<Preset>('30')

  function pick (value: Preset) {
    preset.value = value
    if (value === 'custom') return
    const today = cairoDate()
    emit('update:to', today)
    emit('update:from', value === 'year' ? `${today.slice(0, 4)}-01-01` : cairoDate(Number(value) - 1))
  }
</script>

<style lang="scss" scoped>
.d-pf { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
