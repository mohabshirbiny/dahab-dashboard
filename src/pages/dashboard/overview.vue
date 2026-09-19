<template>
  <div class="d-page">
    <PageLead>Everything that needs a decision today, and where the money stands.</PageLead>

    <template v-if="isLoading">
      <div class="d-loading">Loading…</div>
    </template>

    <template v-else-if="data">
      <OverviewStats :hero="data.hero" :stats="data.stats" />

      <div class="d-split">
        <div class="d-split__left">
          <TransactionsPanel :rows="data.transactions" />
          <NeedsDecisionPanel :rows="data.needsDecision" />
        </div>
        <div class="d-split__right">
          <CustomerLookupPanel />
          <CustomerWalletsPanel :wallets="data.wallets" />
          <GoldPriceNowPanel :price="data.goldPrice" />
          <ThisMonthPanel :month="data.thisMonth" />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import PageLead from '@/components/ui/PageLead.vue'
  import OverviewStats from '@/components/dashboard/OverviewStats.vue'
  import TransactionsPanel from '@/components/dashboard/TransactionsPanel.vue'
  import NeedsDecisionPanel from '@/components/dashboard/NeedsDecisionPanel.vue'
  import CustomerLookupPanel from '@/components/dashboard/CustomerLookupPanel.vue'
  import CustomerWalletsPanel from '@/components/dashboard/CustomerWalletsPanel.vue'
  import GoldPriceNowPanel from '@/components/dashboard/GoldPriceNowPanel.vue'
  import ThisMonthPanel from '@/components/dashboard/ThisMonthPanel.vue'
  import { useOverviewQuery } from '@/composables/useOverview'

  const { data, isLoading } = useOverviewQuery()
</script>

<style lang="scss" scoped>
.d-page {
  display: block;
}
.d-loading {
  padding: 44px 20px;
  text-align: center;
  color: var(--ink-3);
  font-size: 12.5px;
}
.d-split {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 18px;
  align-items: start;
}
.d-split__left, .d-split__right { min-width: 0; }
@media (max-width: 1100px) {
  .d-split { grid-template-columns: 1fr; gap: 14px; }
}
</style>
