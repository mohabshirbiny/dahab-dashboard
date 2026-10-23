<template>
  <StatGrid>
    <StatCard hint="Where the period started" :label="`Balance on ${formatDate(summary.from)}`" :value="formatMoney(summary.opening)" />
    <StatCard :hint="inHint" label="In" :value="formatMoney(summary.in)" value-color="var(--ok)" />
    <StatCard :hint="outHint" label="Out" :value="formatMoney(summary.out)" />
    <StatCard :hint="closingHint" :label="`Balance on ${formatDate(summary.to)}`" :value="formatMoney(summary.closing)" />

    <template v-if="summary.view === 'dahab' && summary.commissionIn !== undefined">
      <StatCard :hint="splitHint(summary.commissionIn, summary.commissionOut)" label="Commission" :value="formatMoney(net(summary.commissionIn, summary.commissionOut))" />
      <StatCard :hint="splitHint(summary.spreadIn, summary.spreadOut)" label="Spread" :value="formatMoney(net(summary.spreadIn, summary.spreadOut))" />

      <StatCard
        v-if="summary.vatIn !== undefined"
        :hint="`${splitHint(summary.vatIn, summary.vatOut)} · owed, not in the balance`"
        label="VAT"
        :value="formatMoney(net(summary.vatIn, summary.vatOut))"
      />
    </template>
  </StatGrid>
</template>

<script lang="ts" setup>
  import type { StatementSummary } from '@/types/wallet'
  import { computed } from 'vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import { formatDate, formatMoney } from '@/composables/useFormatters'

  const props = defineProps<{ summary: StatementSummary }>()

  const inHint = computed(() => props.summary.view === 'dahab' ? 'Commission and spread, shown apart below' : 'Money in, and deposits returned')

  // The Dahab view's two accounts apart (Backend testing fixes): in − out, 4 dp strings.
  function net (moneyIn?: string, moneyOut?: string): string {
    return (Number(moneyIn ?? 0) - Number(moneyOut ?? 0)).toFixed(4)
  }

  function splitHint (moneyIn?: string, moneyOut?: string): string {
    return `In ${formatMoney(moneyIn ?? '0')}, out ${formatMoney(moneyOut ?? '0')}`
  }
  const outHint = computed(() => props.summary.view === 'customer' ? 'Including deposits held' : 'Money out')

  const closingHint = computed(() => {
    const s = props.summary
    if (s.view === 'customer') return `Available ${formatMoney(s.available)}, held ${formatMoney(s.held)}`
    if (s.view === 'customers') return 'Total owed to customers'
    return `VAT payable ${formatMoney(s.vatPayable)}, owed, not earned`
  })
</script>
