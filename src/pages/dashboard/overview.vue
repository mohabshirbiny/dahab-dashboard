<template>
  <div class="d-page">
    <PageLead>Everything that needs a decision today, and where the money stands.</PageLead>

    <OverviewStats v-if="hero || stats.length > 0" :hero="hero" :stats="stats" />

    <!-- Each panel waits only for its own request: /overview, /wallets/overview and the gold price load apart. -->
    <div class="d-split">
      <div class="d-split__left">
        <Panel v-if="isLoading">
          <LoadingState />
        </Panel>

        <Panel v-else-if="isError">
          <ErrorState message="The orders and the items waiting for a decision could not be loaded." title="Could not load the Overview" @retry="refetch()" />
        </Panel>

        <template v-else-if="data">
          <TransactionsPanel v-if="data.transactions" :rows="data.transactions" />
          <NeedsDecisionPanel v-if="data.needsDecision" :rows="data.needsDecision" />
        </template>
      </div>

      <div class="d-split__right">
        <CustomerLookupPanel />

        <template v-if="canSeeWallets">
          <Panel v-if="walletOverview.isLoading.value" title="Customer wallets">
            <LoadingState />
          </Panel>

          <Panel v-else-if="walletOverview.isError.value" title="Customer wallets">
            <ErrorState message="The wallet figures could not be loaded." title="Could not load the wallets" @retry="walletOverview.refetch()" />
          </Panel>

          <CustomerWalletsPanel v-else-if="wallets" :wallets="wallets" />
        </template>

        <template v-if="canSeePrices">
          <Panel v-if="prices.isLoading.value" title="Gold price now">
            <LoadingState />
          </Panel>

          <Panel v-else-if="prices.isError.value" title="Gold price now">
            <ErrorState message="The gold price could not be loaded." title="Could not load the price" @retry="prices.refetch()" />
          </Panel>

          <GoldPriceNowPanel v-else-if="goldPrice" :price="goldPrice" />
        </template>

        <Panel v-if="isLoading && can(PERMISSIONS.orderView)" title="This month">
          <LoadingState />
        </Panel>

        <ThisMonthPanel v-else-if="data?.thisMonth" :month="data.thisMonth" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { CustomerWallets, GoldPriceSnapshot, OverviewHeroStat, OverviewStat } from '@/types/overview'
  import { computed } from 'vue'
  import CustomerLookupPanel from '@/components/dashboard/CustomerLookupPanel.vue'
  import CustomerWalletsPanel from '@/components/dashboard/CustomerWalletsPanel.vue'
  import GoldPriceNowPanel from '@/components/dashboard/GoldPriceNowPanel.vue'
  import NeedsDecisionPanel from '@/components/dashboard/NeedsDecisionPanel.vue'
  import OverviewStats from '@/components/dashboard/OverviewStats.vue'
  import ThisMonthPanel from '@/components/dashboard/ThisMonthPanel.vue'
  import TransactionsPanel from '@/components/dashboard/TransactionsPanel.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useOverviewQuery } from '@/composables/useOverview'
  import { usePermissions } from '@/composables/usePermissions'
  import { useCurrentPricesQuery } from '@/composables/usePricing'
  import { useWalletOverviewQuery } from '@/composables/useWallet'
  import { PERMISSIONS } from '@/types/staff'

  // Every figure is live (Backend specs 008 and 015); a section the viewer may not see is not shown.
  const { data, isLoading, isError, refetch } = useOverviewQuery()

  // The money figures are live (Backend spec 008) and need wallet.view; staff
  // without it do not see them at all (not zeros).
  const { can } = usePermissions()
  const canSeeWallets = computed(() => can(PERMISSIONS.walletView))
  const walletOverview = useWalletOverviewQuery(canSeeWallets)
  const live = computed(() => (canSeeWallets.value ? walletOverview.data.value ?? null : null))

  const hero = computed<OverviewHeroStat | null>(() => {
    const w = live.value
    if (!w) return null
    const short = Number(w.headroom) < 0
    return {
      label: 'Bank balance minus customer wallets',
      value: `${short ? '−' : '+'} ${formatMoney(String(Math.abs(Number(w.headroom))))} EGP`,
      valueColor: short ? 'var(--bad)' : '#7FD0A8',
      hint: `Bank ${formatMoney(w.bank)}  ·  wallets ${formatMoney(w.totalOwed)}. A negative figure here means customer money is short.`,
    }
  })

  const stats = computed<OverviewStat[]>(() => {
    const earnings = data.value?.earnings
    return [
      ...(live.value ? [{ label: 'Held on open orders', value: formatMoney(live.value.heldOnOrders), hint: 'Set aside against open orders' }] : []),
      ...(earnings ? [{ label: 'Dahab earned this month', value: formatMoney(earnings.total), hint: `Commission ${formatMoney(earnings.commission)} · spread ${formatMoney(earnings.spread)}` }] : []),
    ]
  })

  // Gold price now: the pricing page's figures (pricing.view).
  const canSeePrices = computed(() => can(PERMISSIONS.pricingView))
  const prices = useCurrentPricesQuery(canSeePrices)
  const FEED: Record<string, { label: string, variant: 'ok' | 'bad' | 'off' }> = {
    healthy: { label: 'Healthy', variant: 'ok' },
    down: { label: 'Down', variant: 'bad' },
    not_configured: { label: 'Not set up', variant: 'off' },
  }
  const goldPrice = computed<GoldPriceSnapshot | null>(() => {
    const p = prices.data.value
    if (!p) return null
    const k21 = p.karats.find(k => k.code === 21) ?? null
    return {
      sellersGet21k: k21?.sellersGet ?? null,
      buyersPay21k: k21?.buyersPay ?? null,
      differencePerGram: k21?.difference ?? null,
      feedStatus: p.price?.source === 'manual' ? { label: 'Manual price', variant: 'off' } : (FEED[p.feed.state] ?? { label: p.feed.state, variant: 'off' }),
      lastUpdated: p.price?.effectiveAt ?? null,
    }
  })

  const wallets = computed<CustomerWallets | null>(() => live.value
    ? { available: live.value.available, heldOnOpenOrders: live.value.heldOnOrders, pendingWithdrawals: live.value.pendingWithdrawals, totalOwed: live.value.totalOwed }
    : null)
</script>

<style lang="scss" scoped>
.d-page {
  display: block;
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
