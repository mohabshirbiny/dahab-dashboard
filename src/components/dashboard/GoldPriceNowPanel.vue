<template>
  <Panel subtitle="From Evolve" title="Gold price now">
    <div class="d-panel__body">
      <KeyValueRow label="21K, sellers get">
        <span class="num">{{ price.sellersGet21k === null ? '—' : formatMoney(price.sellersGet21k) }}</span>
      </KeyValueRow>

      <KeyValueRow label="21K, buyers pay">
        <span class="num">{{ price.buyersPay21k === null ? '—' : formatMoney(price.buyersPay21k) }}</span>
      </KeyValueRow>

      <KeyValueRow label="Difference per gram">
        <span class="num">{{ price.differencePerGram === null ? '—' : formatMoney(price.differencePerGram) }}</span>
      </KeyValueRow>

      <KeyValueRow label="Feed">
        <StatusTag :label="price.feedStatus.label" :variant="price.feedStatus.variant" />
      </KeyValueRow>

      <KeyValueRow label="Last update">
        {{ price.lastUpdated === null ? '—' : formatRelativeTime(price.lastUpdated) }}
      </KeyValueRow>
    </div>
  </Panel>
</template>

<script lang="ts" setup>
  import type { GoldPriceSnapshot } from '@/types/overview'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatMoney, formatRelativeTime } from '@/composables/useFormatters'

  defineProps<{ price: GoldPriceSnapshot }>()
</script>

<style lang="scss" scoped>
.d-panel__body { padding: 16px; }
</style>
