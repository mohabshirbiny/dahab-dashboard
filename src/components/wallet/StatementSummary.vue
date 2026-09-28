<template>
  <StatGrid>
    <StatCard hint="Where the period started" :label="`Balance on ${formatDate(summary.from)}`" :value="formatMoney(summary.opening)" />
    <StatCard :hint="inHint" label="In" :value="formatMoney(summary.in)" value-color="var(--ok)" />
    <StatCard :hint="outHint" label="Out" :value="formatMoney(summary.out)" />
    <StatCard :hint="closingHint" :label="`Balance on ${formatDate(summary.to)}`" :value="formatMoney(summary.closing)" />
  </StatGrid>
</template>

<script lang="ts" setup>
  import type { StatementSummary } from '@/types/wallet'
  import { computed } from 'vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import { formatDate, formatMoney } from '@/composables/useFormatters'

  const props = defineProps<{ summary: StatementSummary }>()

  const inHint = computed(() => props.summary.view === 'dahab' ? 'Commission and spread' : 'Money in, and deposits returned')
  const outHint = computed(() => props.summary.view === 'customer' ? 'Including deposits held' : 'Money out')

  const closingHint = computed(() => {
    const s = props.summary
    if (s.view === 'customer') return `Available ${formatMoney(s.available)}, held ${formatMoney(s.held)}`
    if (s.view === 'customers') return 'Total owed to customers'
    return `VAT payable ${formatMoney(s.vatPayable)}, owed, not earned`
  })
</script>
