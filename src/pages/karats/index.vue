<template>
  <div class="d-page">
    <PageLead>
      Which karats sellers can choose. Turning one on makes it available in the app immediately, with no new release.
    </PageLead>

    <Panel title="Karats">
      <template v-if="canCreate" #actions>
        <DBtn @click="openAdd">Add a karat</DBtn>
      </template>

      <LoadingState v-if="karats.isPending.value" label="Loading karats…" />

      <ErrorState
        v-else-if="karats.isError.value"
        :message="referenceErrorMessage(karats.error.value)"
        :retryable="errorCodeOf(karats.error.value) !== 'forbidden'"
        title="Could not load karats"
        @retry="karats.refetch()"
      />

      <EmptyState v-else-if="!karats.data.value || karats.data.value.length === 0" title="No karats yet" />

      <!-- "Price today, sellers get" comes from pricing (Backend spec 005), shown with
           pricing.view. "Pieces listed" waits for listings: left out, not faked. -->
      <DataTable v-else>
        <template #head>
          <th>Karat</th>
          <th>Purity</th>
          <th v-if="canSeePrices" class="r">Price today, sellers get</th>
          <th>Available</th>
          <th v-if="canToggle" aria-label="Action" class="r" />
        </template>

        <tr v-for="karat in karats.data.value" :key="karat.code">
          <td class="d-karats__code">{{ karat.code }}K</td>
          <td class="mono">{{ purityPerMille(karat.purity) }}</td>
          <td v-if="canSeePrices" class="r mono">{{ priceOf(karat.code) }}</td>

          <td>
            <StatusTag :label="karat.isEnabled ? 'On' : 'Off'" :variant="karat.isEnabled ? 'ok' : 'off'" />
          </td>

          <td v-if="canToggle" class="r">
            <DBtn
              :aria-label="`${karat.isEnabled ? 'Turn off' : 'Turn on'} ${karat.code}K`"
              :disabled="toggle.isPending.value && toggling === karat.code"
              :kind="karat.isEnabled ? 'danger' : 'success'"
              :loading="toggle.isPending.value && toggling === karat.code"
              @click="flip(karat)"
            >
              {{ karat.isEnabled ? 'Turn off' : 'Turn on' }}
            </DBtn>
          </td>
        </tr>
      </DataTable>

      <template #footer>
        <NoteBanner class="d-karats__note">
          Turning a karat off stops new listings; pieces already listed carry on to the end.
        </NoteBanner>
      </template>
    </Panel>

    <AddKaratModal
      v-model="addOpen"
      :field-errors="addFieldErrors"
      :loading="create.isPending.value"
      :submit-error="addError"
      @confirm="saveKarat"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { CreateKaratInput, Karat } from '@/types/reference'
  import { computed, ref } from 'vue'
  import AddKaratModal from '@/components/reference/AddKaratModal.vue'
  import { referenceErrorMessage } from '@/components/reference/referenceErrors'
  import { fieldError } from '@/components/staff/accessErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { usePermissions } from '@/composables/usePermissions'
  import { useCurrentPricesQuery } from '@/composables/usePricing'
  import { useCreateKarat, useKaratsQuery, useToggleKarat } from '@/composables/useReference'
  import { useToast } from '@/composables/useToast'
  import { errorCodeOf } from '@/services/errors'
  import { formatEgp } from '@/types/pricing'
  import { purityPerMille } from '@/types/reference'
  import { PERMISSIONS } from '@/types/staff'

  const { can } = usePermissions()
  const { ok } = useToast()

  // Viewing needs reference.view (route guard); the buttons follow their own permissions.
  const canToggle = computed(() => can(PERMISSIONS.karatsToggle))
  const canCreate = computed(() => can(PERMISSIONS.karatsCreate))

  const karats = useKaratsQuery()

  // Today's price per karat (Backend spec 005), for staff who may see prices.
  const canSeePrices = computed(() => can(PERMISSIONS.pricingView))
  const prices = useCurrentPricesQuery(canSeePrices)

  function priceOf (code: number): string {
    if (prices.isPending.value) return '…'
    const row = prices.data.value?.karats.find(k => k.code === code)
    return row ? formatEgp(row.sellersGet) : 'No price yet'
  }

  const toggle = useToggleKarat()
  const toggling = ref<number | null>(null)

  function flip (karat: Karat) {
    toggling.value = karat.code
    const enabled = !karat.isEnabled
    // Spec 004 edge case: turning off the last karat is allowed, but sellers are left with no choice.
    const lastOn = !enabled && (karats.data.value ?? []).filter(k => k.isEnabled).length === 1
    toggle.mutate({ code: karat.code, enabled }, {
      onSuccess: () => ok(enabled
        ? `${karat.code}K turned on. Sellers can choose it now.`
        : (lastOn
          ? `${karat.code}K turned off. No karat is on now: sellers can't list gold until you turn one on.`
          : `${karat.code}K turned off. Existing listings are not affected.`)),
      onError: error => ok(referenceErrorMessage(error)),
      onSettled: () => {
        toggling.value = null
      },
    })
  }

  const create = useCreateKarat()
  const addOpen = ref(false)
  const addError = ref<string>()
  const addFieldErrors = ref<Partial<Record<'code' | 'purity', string>>>({})

  function openAdd () {
    addError.value = undefined
    addFieldErrors.value = {}
    addOpen.value = true
  }

  function saveKarat (payload: CreateKaratInput) {
    addError.value = undefined
    addFieldErrors.value = {}
    create.mutate(payload, {
      onSuccess: karat => {
        addOpen.value = false
        ok(`${karat.code}K added. It is off until you turn it on.`)
      },
      onError: error => {
        addFieldErrors.value = { code: fieldError(error, 'code'), purity: fieldError(error, 'purity') }
        addError.value = referenceErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-karats__code { font-weight: 600; }
.d-karats__note { margin-top: 12px; }
</style>
