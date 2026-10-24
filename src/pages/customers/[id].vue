<template>
  <div class="d-page">
    <PageLead>Everything on one person. Opening this file is logged, because it shows identity documents.</PageLead>

    <LoadingState v-if="isPending" label="Loading the customer file…" />

    <Panel v-else-if="isError">
      <ErrorState
        :message="errorMessage"
        :retryable="failure !== 'forbidden' && failure !== 'not_found'"
        :title="failure === 'not_found' ? 'We could not find this customer' : 'Could not load this customer'"
        @retry="refetch()"
      />
    </Panel>

    <div v-else-if="customer" class="d-file">
      <div class="d-file__main">
        <IdentityDocumentsPanel :documents="customer.documents" />
        <CustomerSessionsPanel :customer-id="customer.id" />
        <CustomerNotificationsPanel :customer-id="customer.id" />
      </div>

      <div class="d-file__side">
        <NoteBanner v-if="customer.closure" class="d-file__closed" variant="info">
          They closed the account on {{ formatDateTime(customer.closure.closedAt) }}: {{ CLOSE_REASON_LABELS[customer.closure.reason] }}{{ customer.closure.note ? ` — “${customer.closure.note}”` : '' }}.
          Nothing was deleted; they cannot sign in again.
        </NoteBanner>

        <CustomerProfileCard :customer="customer">
          <template v-if="(canSuspend || canSetType) && open === null && !customer.closure" #actions>
            <template v-if="canSuspend">
              <DBtn v-if="customer.suspension" kind="primary" @click="open = 'reinstate'">Reinstate</DBtn>
              <DBtn v-else kind="danger" @click="open = 'suspend'">Suspend</DBtn>
            </template>

            <DBtn v-if="canSetType" @click="open = 'type'">
              {{ customer.type === 'market_maker' ? 'Remove as market maker' : 'Make market maker' }}
            </DBtn>
          </template>

          <SuspendForm v-if="canSuspend && open === 'suspend'" :customer-id="customer.id" @cancel="open = null" @done="open = null" />

          <ReinstateForm
            v-else-if="canSuspend && open === 'reinstate' && customer.suspension"
            :customer-id="customer.id"
            :status-before="customer.suspension.statusBefore"
            @cancel="open = null"
            @done="open = null"
          />

          <SetCustomerTypeForm
            v-else-if="canSetType && open === 'type'"
            :current="customer.type"
            :customer-id="customer.id"
            @cancel="open = null"
            @done="open = null"
          />
        </CustomerProfileCard>

        <CustomerWalletPanel v-if="can(PERMISSIONS.walletView)" :customer-id="customer.id" />

        <FirstSaleCard v-if="customer.firstSale" :customer-id="customer.id" :first-sale="customer.firstSale" />

        <PayoutAccountsPanel
          :accounts="customer.payoutAccounts"
          :customer-id="customer.id"
          :pause-trigger="customer.withdrawalPauseTrigger"
          :pause-until="customer.withdrawalPauseUntil"
        />

        <CustomerHistoryPanel v-if="canSeeHistory" :customer-id="customer.id" :own-only="!can(PERMISSIONS.auditViewAll)" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import CustomerHistoryPanel from '@/components/customer-file/CustomerHistoryPanel.vue'
  import CustomerNotificationsPanel from '@/components/customer-file/CustomerNotificationsPanel.vue'
  import CustomerProfileCard from '@/components/customer-file/CustomerProfileCard.vue'
  import CustomerSessionsPanel from '@/components/customer-file/CustomerSessionsPanel.vue'
  import CustomerWalletPanel from '@/components/customer-file/CustomerWalletPanel.vue'
  import FirstSaleCard from '@/components/customer-file/FirstSaleCard.vue'
  import IdentityDocumentsPanel from '@/components/customer-file/IdentityDocumentsPanel.vue'
  import PayoutAccountsPanel from '@/components/customer-file/PayoutAccountsPanel.vue'
  import ReinstateForm from '@/components/customer-file/ReinstateForm.vue'
  import SetCustomerTypeForm from '@/components/customer-file/SetCustomerTypeForm.vue'
  import SuspendForm from '@/components/customer-file/SuspendForm.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { useCustomerFileQuery } from '@/composables/useCustomerFile'
  import { formatDateTime } from '@/composables/useFormatters'
  import { usePermissions } from '@/composables/usePermissions'
  import { errorCodeOf } from '@/services/errors'
  import { CLOSE_REASON_LABELS } from '@/types/customer'
  import { PERMISSIONS } from '@/types/staff'

  // Customer file (Backend spec 007). Panels for features the Backend does not have
  // yet (orders, listings) are left out, not faked; payout accounts are live (spec 013). The wallet
  // panel (spec 008) shows only to staff holding wallet.view.
  const route = useRoute()
  const customerId = computed(() => String(route.params.id ?? ''))

  const { data: customer, error, isPending, isError, refetch } = useCustomerFileQuery(customerId)

  // Suspend and reinstate share one permission (Backend `customer.suspend`).
  const { can } = usePermissions()
  const canSuspend = computed(() => can(PERMISSIONS.customerSuspend))
  // Making a market maker follows the Backend's `promo.manage` (the same permission as dealer codes).
  const canSetType = computed(() => can(PERMISSIONS.promoManage))
  const open = ref<'suspend' | 'reinstate' | 'type' | null>(null)
  // A successful suspend / reinstate / type change replaces the cached file, which can unmount the
  // form before its `done` event arrives: close it whenever the status or the type changes.
  watch(() => [customer.value?.status, customer.value?.type], () => {
    open.value = null
  })

  // History follows the viewer's audit permission (everything, or own actions only).
  const canSeeHistory = computed(() => can(PERMISSIONS.auditViewAll) || can(PERMISSIONS.auditViewOwn))

  const failure = computed(() => errorCodeOf(error.value))
  const errorMessage = computed(() => {
    if (failure.value === 'forbidden') return 'Your account does not have permission to view customers.'
    if (failure.value === 'not_found') return 'It may have been removed, or the address may be mistyped.'
    if (failure.value === 'too_many_requests') return 'Too many requests. Wait a moment and try again.'
    return 'The customer could not be loaded. Check your connection and try again.'
  })
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-file {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 18px;
  align-items: start;
}
.d-file__main, .d-file__side { display: grid; gap: 18px; min-width: 0; }
@media (max-width: 1100px) {
  .d-file { grid-template-columns: 1fr; }
  .d-file__side { order: -1; }
}
</style>
