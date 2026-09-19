<template>
  <Panel title="Gold price now" subtitle="From Evolve">
    <div class="d-panel__body">
      <KeyValueRow label="21K, sellers get">
        <span class="num">{{ formatNumber(price.sellersGet21k) }}</span>
      </KeyValueRow>
      <KeyValueRow label="21K, buyers pay">
        <span class="num">{{ formatNumber(price.buyersPay21k) }}</span>
      </KeyValueRow>
      <KeyValueRow label="Difference per gram">
        <span class="num">{{ formatNumber(price.differencePerGram) }}</span>
      </KeyValueRow>
      <KeyValueRow label="Feed">
        <StatusTag :label="price.feedStatus.label" :variant="price.feedStatus.variant" />
      </KeyValueRow>
      <KeyValueRow label="Last update">
        {{ price.lastUpdated }}
      </KeyValueRow>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
  import Panel from '@/components/ui/Panel.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatNumber } from '@/composables/useFormatters'
  import type { GoldPriceSnapshot } from '@/types/overview'

  defineProps<{ price: GoldPriceSnapshot }>()
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
</style>
