<template>
  <div class="d-page">
    <PageLead>Everything that needs a decision today, and where the money stands.</PageLead>

    <template v-if="isLoading">
      <div class="d-loading">Loading…</div>
    </template>

    <template v-else-if="data">
      <OverviewStats :hero="hero" :stats="stats" />

      <div class="d-split">
        <div class="d-split__left">
          <TransactionsPanel :rows="data.transactions" />
          <NeedsDecisionPanel :rows="data.needsDecision" />
        </div>

        <div class="d-split__right">
          <CustomerLookupPanel />
          <CustomerWalletsPanel v-if="wallets" :wallets="wallets" />
          <GoldPriceNowPanel :price="data.goldPrice" />
          <ThisMonthPanel :month="data.thisMonth" />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import type { CustomerWallets, OverviewHeroStat, OverviewStat } from '@/types/overview'
  import { computed } from 'vue'
  import CustomerLookupPanel from '@/components/dashboard/CustomerLookupPanel.vue'
  import CustomerWalletsPanel from '@/components/dashboard/CustomerWalletsPanel.vue'
  import GoldPriceNowPanel from '@/components/dashboard/GoldPriceNowPanel.vue'
  import NeedsDecisionPanel from '@/components/dashboard/NeedsDecisionPanel.vue'
  import OverviewStats from '@/components/dashboard/OverviewStats.vue'
  import ThisMonthPanel from '@/components/dashboard/ThisMonthPanel.vue'
  import TransactionsPanel from '@/components/dashboard/TransactionsPanel.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useOverviewQuery } from '@/composables/useOverview'
  import { usePermissions } from '@/composables/usePermissions'
  import { useWalletOverviewQuery } from '@/composables/useWallet'
  import { PERMISSIONS } from '@/types/staff'

  const { data, isLoading } = useOverviewQuery()

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

  const stats = computed<OverviewStat[]>(() => [
    ...(live.value ? [{ label: 'Held on open orders', value: formatMoney(live.value.heldOnOrders), hint: 'Set aside against open orders' }] : []),
    ...(data.value?.stats ?? []),
  ])

  const wallets = computed<CustomerWallets | null>(() => live.value
    ? { available: live.value.available, heldOnOpenOrders: live.value.heldOnOrders, pendingWithdrawals: live.value.pendingWithdrawals, totalOwed: live.value.totalOwed }
    : null)
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
