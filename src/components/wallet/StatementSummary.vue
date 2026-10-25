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

      <!-- Stone certificate fees taken from sellers at settlement: owed to IGI, not earned, not in the balance. -->
      <StatCard
        v-if="summary.certificateIn !== undefined"
        :hint="`${splitHint(summary.certificateIn, summary.certificateOut ?? '0')} · held for IGI, not in the balance${summary.certificatesPayable ? ` · total held ${formatMoney(summary.certificatesPayable)}` : ''}`"
        label="Certificate fees"
        :value="formatMoney(net(summary.certificateIn, summary.certificateOut ?? '0'))"
      />

      <!-- Spec 023: Dahab's money paid to a seller ahead and recovered when the buyer pays — not earned, not in the balance. -->
      <StatCard
        v-if="summary.advanceOut !== undefined"
        :hint="`Paid ${formatMoney(summary.advanceOut)}, back ${formatMoney(summary.advanceBack ?? '0')} · Dahab's money, not in the balance`"
        label="First-sale advance still out"
        :value="formatMoney(net(summary.advanceOut, summary.advanceBack))"
      />
    </template>

    <!-- Dahab's own money (external_equity): one card per kind of movement, then the advances and the total. -->
    <template v-if="summary.view === 'equity'">
      <StatCard
        v-for="group in summary.groups ?? []"
        :key="group.key"
        :hint="splitHint(group.in, group.out)"
        :label="group.label"
        :value="formatMoney(net(group.in, group.out))"
      />

      <StatCard
        v-if="summary.advancesOutstanding !== undefined"
        :hint="advancesHint"
        label="First-sale advances still out today"
        :value="formatMoney(summary.advancesOutstanding)"
      />

      <StatCard
        v-if="summary.ownMoneyTotal !== undefined"
        :hint="`Own money ${formatMoney(summary.closing)} + earned ${formatMoney(summary.earned ?? '0')} (commission and spread)`"
        :label="`Own money and earnings on ${formatDate(summary.to)}`"
        :value="formatMoney(summary.ownMoneyTotal)"
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

  const inHint = computed(() => {
    if (props.summary.view === 'dahab') return 'Commission and spread, shown apart below'
    if (props.summary.view === 'equity') return 'Capital, refunds and advances back, shown apart below'
    return 'Money in, and deposits returned'
  })

  const advancesHint = computed(() => {
    const s = props.summary
    const count = s.advancesOutstandingCount ?? 0
    return `${count} ${count === 1 ? 'advance' : 'advances'} · written off ${formatMoney(s.advancesWrittenOff ?? '0')}, shortfall ${formatMoney(s.advancesShortfall ?? '0')}`
  })

  // The Dahab view's two accounts apart (Backend testing fixes): in − out, 4 dp strings.
  function net (moneyIn?: string, moneyOut?: string): string {
    return (Number(moneyIn ?? 0) - Number(moneyOut ?? 0)).toFixed(4)
  }

  function splitHint (moneyIn?: string, moneyOut?: string): string {
    return `In ${formatMoney(moneyIn ?? '0')}, out ${formatMoney(moneyOut ?? '0')}`
  }
  const outHint = computed(() => {
    if (props.summary.view === 'customer') return 'Including deposits held'
    if (props.summary.view === 'equity') return 'Advances, compensation, adjustments, expenses and profit taken out'
    return 'Money out'
  })

  const closingHint = computed(() => {
    const s = props.summary
    if (s.view === 'customer') return `Available ${formatMoney(s.available)}, held ${formatMoney(s.held)}`
    if (s.view === 'customers') return 'Total owed to customers'
    if (s.view === 'equity') return 'Put in by the owners, less what was spent from it'
    return `VAT payable ${formatMoney(s.vatPayable)}, owed, not earned`
  })
</script>
