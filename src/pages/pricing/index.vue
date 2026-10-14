<template>
  <div class="d-page">
    <PageLead>
      The price feed gives the 24K bid and ask; every karat follows by purity, and each karat's adjustments turn them into
      what sellers get and what buyers pay. The difference is Dahab's spread, on gold only.
    </PageLead>

    <div class="d-split">
      <div class="d-split__left">
        <Panel id="karat-prices" subtitle="Buy side = sellers get · sell side = buyers pay" title="Prices per karat">
          <LoadingState v-if="current.isPending.value" label="Loading prices…" />

          <ErrorState
            v-else-if="current.isError.value"
            :message="pricingErrorMessage(current.error.value)"
            :retryable="errorCodeOf(current.error.value) !== 'forbidden'"
            title="Could not load prices"
            @retry="current.refetch()"
          />

          <EmptyState
            v-else-if="!current.data.value?.price"
            title="No gold price yet"
          />

          <template v-else>
            <div class="d-pr__source">
              24K bid {{ formatEgp(current.data.value.price.bid24k) }} · ask {{ formatEgp(current.data.value.price.ask24k) }} ·
              {{ current.data.value.price.source === 'feed' ? 'from the feed' : 'manual' }},
              {{ formatDateTime(current.data.value.price.effectiveAt) }}
            </div>

            <KaratPricesTable :can-edit="canRates" :rows="current.data.value.karats" @edit="openAdjustments" />
          </template>

          <template #footer>
            <NoteBanner class="d-pr__note">
              Calculated by the server, never typed in. Customers always read the figure they are actually charged.
              Diamonds and gold-with-diamond are sold at one fixed price with no spread.
            </NoteBanner>
          </template>
        </Panel>

        <ManualPricePanel
          v-if="current.data.value"
          ref="manualPanel"
          :can-confirm="can(PERMISSIONS.goldPriceConfirm)"
          :can-enter="can(PERMISSIONS.goldPriceEnter)"
          :confirming="confirm.isPending.value"
          :current-user-id="auth.user?.id ?? null"
          :deviation-pct="numericSetting('manualprice.confirm_deviation_pct')"
          :feed-state="current.data.value.feed.state"
          :last-manual="lastManual"
          :must-differ="settingValue('manualprice.confirmer_must_differ') !== false"
          :pending="current.data.value.pending"
          :submit-error="manualError"
          :submitting="enter.isPending.value"
          @confirm="confirmPrice"
          @submit="enterPrice"
        />
      </div>

      <div class="d-split__right">
        <Panel title="Recent price changes">
          <LoadingState v-if="history.isPending.value || adjustments.isPending.value" label="Loading changes…" />
          <EmptyState v-else-if="changes.length === 0" title="No changes yet" />

          <DataTable v-else>
            <template #head>
              <th>When</th>
              <th>What</th>
              <th>By</th>
            </template>

            <tr v-for="change in changes" :key="change.id">
              <td class="mono">{{ formatDateTime(change.at) }}</td>

              <td>
                {{ change.what }}
                <div v-if="change.reason" class="who2">{{ change.reason }}</div>
              </td>

              <td>{{ change.by }}</td>
            </tr>
          </DataTable>
        </Panel>
      </div>
    </div>

    <AdjustmentModal
      v-model="adjustOpen"
      :karat="adjusting"
      :loading="updateAdjustments.isPending.value"
      :submit-error="adjustError"
      @confirm="saveAdjustments"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { Adjustment, KaratPrice, PriceInput } from '@/types/pricing'
  import { computed, ref } from 'vue'
  import AdjustmentModal from '@/components/pricing/AdjustmentModal.vue'
  import KaratPricesTable from '@/components/pricing/KaratPricesTable.vue'
  import ManualPricePanel from '@/components/pricing/ManualPricePanel.vue'
  import { pricingErrorMessage } from '@/components/pricing/pricingErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import {
    useAdjustmentHistoryQuery,
    useConfirmManualPrice,
    useCurrentPricesQuery,
    useEnterManualPrice,
    usePriceHistoryQuery,
    useSettingsQuery,
    useUpdateAdjustments,
  } from '@/composables/usePricing'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf } from '@/services/errors'
  import { useAuthStore } from '@/stores/auth'
  import { formatAdjustment, formatEgp } from '@/types/pricing'
  import { PERMISSIONS } from '@/types/staff'

  const auth = useAuthStore()
  const { can } = usePermissions()
  const { ok } = useToast()

  // Viewing needs pricing.view (route guard); each control follows its own permission.
  const canRates = computed(() => can(PERMISSIONS.pricingRatesManage))

  const current = useCurrentPricesQuery()
  const history = usePriceHistoryQuery()
  const adjustments = useAdjustmentHistoryQuery()
  const settings = useSettingsQuery()

  function settingValue (key: string): string | boolean | null {
    return settings.data.value?.find(s => s.key === key)?.value ?? null
  }

  function numericSetting (key: string): string | null {
    const value = settingValue(key)
    return typeof value === 'string' ? value : null
  }

  const lastManual = computed(() => history.data.value?.find(p => p.source === 'manual') ?? null)

  // Price and adjustment changes, newest first (the design's "Recent price changes").
  const changes = computed(() => {
    const prices = (history.data.value ?? []).map(p => ({
      id: `p${p.id}`,
      at: p.effectiveAt,
      what: `${p.source === 'feed' ? 'Feed price' : 'Manual price'} ${formatEgp(p.bid24k)} / ${formatEgp(p.ask24k)}`,
      by: p.source === 'feed' ? 'Price feed' : (p.confirmedBy?.fullName ?? p.enteredBy?.fullName ?? '—'),
      reason: p.reason,
    }))
    const adjusts = (adjustments.data.value ?? []).map(a => ({
      id: `a${a.id}`,
      at: a.changedAt,
      what: `${a.karatCode}K ${a.side} side ${formatAdjustment(a.old)} → ${formatAdjustment(a.new)}`,
      by: a.changedBy.fullName,
      reason: a.reason,
    }))
    const merged = [...prices, ...adjusts]
    merged.sort((x, y) => Date.parse(y.at) - Date.parse(x.at))
    return merged.slice(0, 12)
  })

  // Adjustments
  const updateAdjustments = useUpdateAdjustments()
  const adjustOpen = ref(false)
  const adjusting = ref<KaratPrice | null>(null)
  const adjustError = ref<string>()

  function openAdjustments (row: KaratPrice) {
    adjusting.value = row
    adjustError.value = undefined
    adjustOpen.value = true
  }

  function saveAdjustments (payload: { buy: Adjustment, sell: Adjustment, reason: string }) {
    if (!adjusting.value) return
    const code = adjusting.value.code
    adjustError.value = undefined
    updateAdjustments.mutate({ code, ...payload }, {
      onSuccess: () => {
        adjustOpen.value = false
        ok(`${code}K adjustments saved. The published difference updated with them.`)
      },
      onError: error => {
        adjustError.value = pricingErrorMessage(error)
      },
    })
  }

  // Manual price
  const enter = useEnterManualPrice()
  const confirm = useConfirmManualPrice()
  const manualError = ref<string>()
  const manualPanel = ref<InstanceType<typeof ManualPricePanel> | null>(null)

  function enterPrice (payload: { price: PriceInput, reason: string }) {
    manualError.value = undefined
    enter.mutate(payload, {
      onSuccess: result => {
        manualPanel.value?.reset()
        ok(result.pending
          ? 'The change is large, so it waits for a confirmation before it goes live.'
          : 'Manual price set. Every karat follows from it now.')
      },
      onError: error => {
        manualError.value = pricingErrorMessage(error)
      },
    })
  }

  function confirmPrice (id: number) {
    manualError.value = undefined
    confirm.mutate(id, {
      onSuccess: () => ok('Price confirmed. It is live now.'),
      onError: error => {
        manualError.value = pricingErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-pr__source { padding: 10px 16px; font-size: 12px; color: var(--ink-2); border-bottom: 1px solid var(--line); }
.d-pr__note { margin-top: 12px; }
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
