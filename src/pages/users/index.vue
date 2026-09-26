<template>
  <div class="d-page">
    <PageLead>
      Identity documents are the most sensitive data here. Every view is logged, whether or not it leads to a decision.
    </PageLead>

    <FilterChips
      :model-value="filters.status"
      :options="statusOptions"
      @update:model-value="setStatus"
    />

    <div class="d-users" :class="{ 'd-users--split': filters.customer }">
      <div class="d-users__list">
        <Panel :title="PANEL_TITLES[filters.status]">
          <LoadingState v-if="isPending" label="Loading customers…" />

          <ErrorState
            v-else-if="isError"
            :message="errorMessage"
            :retryable="!isForbidden"
            title="Could not load customers"
            @retry="refetch()"
          />

          <EmptyState
            v-else-if="!data || data.items.length === 0"
            :description="emptyDescription"
            title="Nobody here yet"
          />

          <template v-else>
            <div :class="{ 'd-users__stale': isPlaceholderData }">
              <CustomersTable :rows="data.items" :selected-id="filters.customer" @select="select" />
            </div>

            <Pagination
              :page="data.page"
              :page-size="data.pageSize"
              :total="data.total"
              @update:page="setPage"
            />
          </template>
        </Panel>
      </div>

      <aside v-if="filters.customer" class="d-users__side">
        <CustomerReviewPanel :key="filters.customer" :customer-id="filters.customer" @close="select(null)" />
      </aside>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { CustomerStatus } from '@/types/customer'
  import { computed, watch } from 'vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Pagination from '@/components/ui/Pagination.vue'
  import Panel from '@/components/ui/Panel.vue'
  import CustomerReviewPanel from '@/components/users/CustomerReviewPanel.vue'
  import CustomersTable from '@/components/users/CustomersTable.vue'
  import { useCustomerFilters } from '@/composables/useCustomerFilters'
  import { useCustomerCountsQuery, useCustomersQuery } from '@/composables/useCustomers'
  import { errorCodeOf } from '@/services/errors'

  const { filters, setStatus, setPage, select } = useCustomerFilters()
  const { data, error, isPending, isError, isPlaceholderData, refetch } = useCustomersQuery(filters)
  const { data: counts } = useCustomerCountsQuery()

  const failure = computed(() => errorCodeOf(error.value))
  const isForbidden = computed(() => failure.value === 'forbidden')
  const errorMessage = computed(() => {
    if (isForbidden.value) return 'Your account does not have permission to view customers.'
    if (failure.value === 'too_many_requests') return 'Too many requests. Wait a moment and try again.'
    return 'The list could not be loaded. Check your connection and try again.'
  })

  const statusOptions = computed<Array<{ value: CustomerStatus, label: string, count?: number }>>(() => [
    { value: 'pending_verification', label: 'Waiting', count: counts.value?.pending_verification },
    { value: 'active', label: 'Verified', count: counts.value?.active },
    { value: 'rejected', label: 'Rejected', count: counts.value?.rejected },
    { value: 'suspended', label: 'Suspended', count: counts.value?.suspended },
  ])

  const PANEL_TITLES: Record<CustomerStatus, string> = {
    pending_verification: 'Waiting for verification',
    active: 'Verified customers',
    rejected: 'Rejected customers',
    suspended: 'Suspended customers',
  }

  const emptyDescription = computed(() =>
    filters.value.status === 'pending_verification'
      ? 'Every customer who signed up has been reviewed.'
      : 'There are no customers with this status.',
  )

  // A decision shortens the queue: if the page being shown no longer exists, go to the last one.
  watch(data, result => {
    if (result && result.items.length === 0 && result.total > 0 && result.page > 1) {
      setPage(Math.ceil(result.total / result.pageSize))
    }
  })
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-users { display: block; }
.d-users--split {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 18px;
  align-items: start;
}
.d-users__list, .d-users__side { min-width: 0; }
.d-users__stale { opacity: .55; transition: opacity .15s ease; }
@media (max-width: 1100px) {
  .d-users--split { grid-template-columns: 1fr; gap: 14px; }
}
</style>
