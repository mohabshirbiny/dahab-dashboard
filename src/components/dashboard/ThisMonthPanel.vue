<template>
  <Panel title="This month">
    <div class="d-panel__body">
      <KeyValueRow label="New sellers">
        <span class="num">{{ formatNumber(month.newSellers) }}</span>
      </KeyValueRow>
      <KeyValueRow label="Pieces listed">
        <span class="num">{{ formatNumber(month.piecesListed) }}</span>
      </KeyValueRow>
      <KeyValueRow label="Sold">
        <span class="num">{{ formatNumber(month.sold) }}</span>
      </KeyValueRow>
      <KeyValueRow label="Sell-through">
        <span class="num">{{ month.sellThroughPct }}%</span>
      </KeyValueRow>
      <KeyValueRow label="Money reaches sellers in">
        {{ month.moneyReachesSellersIn }}
      </KeyValueRow>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
  import Panel from '@/components/ui/Panel.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import { formatNumber } from '@/composables/useFormatters'
  import type { ThisMonth } from '@/types/overview'

  defineProps<{ month: ThisMonth }>()
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
</style>
