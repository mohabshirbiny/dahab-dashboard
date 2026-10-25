<template>
  <Panel class="d-pcd" :title="`Code ${code.code}`">
    <template #actions>
      <StatusTag :label="code.is_active ? 'On' : 'Off'" :variant="code.is_active ? 'ok' : 'off'" />
      <DBtn @click="emit('close')">Close</DBtn>
    </template>

    <template #body>
      <p class="d-pcd__lead">{{ code.is_active ? 'Customers can use this code now.' : 'This code is off: nobody can use it.' }}</p>

      <div class="d-pcd__grid">
        <section class="d-pcd__card">
          <h3 class="d-pcd__h">What it does</h3>

          <div class="d-pcd__row">
            <span class="d-pcd__k">Who types it</span>
            <span class="d-pcd__v">{{ sideWords(code) }}</span>
          </div>

          <div class="d-pcd__row">
            <span class="d-pcd__k">For which pieces</span>
            <span class="d-pcd__v">{{ productWords(code) }}</span>
          </div>

          <div class="d-pcd__row">
            <span class="d-pcd__k">Effect</span>

            <span class="d-pcd__v">
              <span v-for="line in effectLines(code)" :key="line" class="d-pcd__line">{{ line }}</span>
            </span>
          </div>

          <div class="d-pcd__example">
            <span class="d-pcd__k">Example</span>
            <span>{{ exampleLine(code) }}</span>
          </div>
        </section>

        <section class="d-pcd__card">
          <h3 class="d-pcd__h">Who and how often</h3>

          <div class="d-pcd__row">
            <span class="d-pcd__k">Who can use it</span>

            <span class="d-pcd__v">
              <template v-if="code.tied_to.audience === 'account'">
                <span class="d-pcd__line">{{ code.tied_to.customer.full_name }}</span>
                <span class="who2">{{ code.tied_to.customer.display_ref }}<template v-if="code.tied_to.customer.phone_masked"> · {{ code.tied_to.customer.phone_masked }}</template></span>
              </template>

              <template v-else>Everyone</template>
              <span v-if="code.first_sale_only" class="who2">Only on the seller's first sale</span>
            </span>
          </div>

          <div class="d-pcd__row">
            <span class="d-pcd__k">Limits</span>

            <span class="d-pcd__v">
              <span v-for="line in limitLines(code)" :key="line" class="d-pcd__line">{{ line }}</span>
            </span>
          </div>

          <div class="d-pcd__row">
            <span class="d-pcd__k">Used this month</span>
            <span class="d-pcd__v mono">{{ usedThisMonth(code) }}</span>
          </div>

          <div class="d-pcd__row">
            <span class="d-pcd__k">Made</span>
            <span class="d-pcd__v">{{ formatDateTime(code.created_at) }}</span>
          </div>
        </section>
      </div>
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import type { PromoCodeRow } from '@/composables/useMarketMakers'
  import { effectLines, exampleLine, limitLines, productWords, sideWords, usedThisMonth } from '@/components/promo/promoFormat'
  import DBtn from '@/components/ui/DBtn.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'

  // Every term of one code in plain words (owner note 2026-10-25: "I don't remember what this code does").
  // Read from the list row: the Backend sends every term there.
  defineProps<{ code: PromoCodeRow }>()
  const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<style lang="scss" scoped>
.d-pcd { margin-top: 16px; }
.d-pcd__lead { margin: 0 0 14px; font-size: 12.5px; color: var(--ink-2); }
.d-pcd__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.d-pcd__card { border: 1px solid var(--line); border-radius: var(--r-panel); padding: 4px 14px 10px; }
.d-pcd__h { margin: 10px 0 4px; font-size: 11.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-3); }
.d-pcd__row { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 12.5px; }
.d-pcd__row:last-child { border-bottom: 0; }
.d-pcd__k { color: var(--ink-2); }
.d-pcd__v { display: flex; flex-direction: column; gap: 3px; font-weight: 500; }
.d-pcd__line { display: block; }
.d-pcd__example { margin-top: 10px; padding: 10px 12px; border-radius: 8px; background: var(--row-head); font-size: 12.5px; display: flex; flex-direction: column; gap: 4px; }

@media (max-width: 900px) {
  .d-pcd__grid { grid-template-columns: 1fr; }
}
</style>
