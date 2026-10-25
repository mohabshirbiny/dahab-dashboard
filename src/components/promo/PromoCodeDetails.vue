<template>
  <Panel class="d-pcd" :subtitle="code.is_active ? 'On — customers can use it now' : 'Off — nobody can use it'" :title="`Code ${code.code}`">
    <template #actions>
      <DBtn @click="emit('close')">Close</DBtn>
    </template>

    <dl class="d-pcd__list">
      <dt>Who types it</dt>
      <dd>{{ sideWords(code) }}</dd>

      <dt>For which pieces</dt>
      <dd>{{ productWords(code) }}</dd>

      <dt>What it does</dt>

      <dd>
        <div v-for="line in effectLines(code)" :key="line">{{ line }}</div>
      </dd>

      <dt>Example</dt>
      <dd>{{ exampleLine(code) }}</dd>

      <dt>Who can use it</dt>

      <dd>
        <template v-if="code.tied_to.audience === 'account'">
          Only {{ code.tied_to.customer.full_name }} ({{ code.tied_to.customer.display_ref }}<template v-if="code.tied_to.customer.phone_masked">, {{ code.tied_to.customer.phone_masked }}</template>)
        </template>

        <template v-else>Everyone</template>
        <div v-if="code.first_sale_only" class="who2">Only on the seller's first sale</div>
      </dd>

      <dt>Limits</dt>

      <dd>
        <div v-for="line in limitLines(code)" :key="line">{{ line }}</div>
      </dd>

      <dt>Used this month</dt>
      <dd class="mono">{{ usedThisMonth(code) }}</dd>

      <dt>Made</dt>
      <dd>{{ formatDateTime(code.created_at) }}</dd>
    </dl>
  </Panel>
</template>

<script lang="ts" setup>
  import type { PromoCodeRow } from '@/composables/useMarketMakers'
  import { effectLines, exampleLine, limitLines, productWords, sideWords, usedThisMonth } from '@/components/promo/promoFormat'
  import DBtn from '@/components/ui/DBtn.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDateTime } from '@/composables/useFormatters'

  // Every term of one code in plain words (owner note 2026-10-25: "I don't remember what this code does").
  // Read from the list row: the Backend sends every term there.
  defineProps<{ code: PromoCodeRow }>()
  const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<style lang="scss" scoped>
.d-pcd { margin-top: 16px; }
.d-pcd__list { display: grid; grid-template-columns: 180px 1fr; gap: 10px 18px; margin: 0; }
.d-pcd__list dt { color: var(--ink-3); font-size: 13px; }
.d-pcd__list dd { margin: 0; }
</style>
