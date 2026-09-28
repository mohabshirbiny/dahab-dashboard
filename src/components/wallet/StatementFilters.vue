<template>
  <div class="d-sf">
    <FilterChips :model-value="view" :options="viewOptions" @update:model-value="emit('update:view', $event)" />

    <div class="d-sf__row">
      <form v-if="view === 'customer' && canSearch" class="d-sf__find" role="search" @submit.prevent="search">
        <FormField v-slot="{ controlId }" label="Customer reference or phone">
          <DInput
            :id="controlId"
            v-model="term"
            autocomplete="off"
            :maxlength="32"
            placeholder="4417 or +20 10 1234 5678"
          />
        </FormField>

        <DBtn :disabled="term.trim() === ''" type="submit">Find</DBtn>
      </form>

      <FormField v-slot="{ controlId }" label="Period">
        <DSelect :id="controlId" :model-value="period" :options="PERIOD_OPTIONS" @update:model-value="emit('update:period', $event)" />
      </FormField>

      <template v-if="period === 'custom'">
        <FormField v-slot="{ controlId }" label="From">
          <DInput :id="controlId" :model-value="from" type="date" @update:model-value="emit('update:from', String($event))" />
        </FormField>

        <FormField v-slot="{ controlId }" label="To">
          <DInput :id="controlId" :model-value="to" type="date" @update:model-value="emit('update:to', String($event))" />
        </FormField>
      </template>

      <FormField v-slot="{ controlId }" label="Show">
        <DSelect :id="controlId" :model-value="grain" :options="GRAIN_OPTIONS" @update:model-value="emit('update:grain', $event)" />
      </FormField>
    </div>

    <div v-if="view === 'customer' && canSearch && searchTerm !== ''" class="d-sf__results">
      <LoadingState v-if="results.isPending.value" label="Searching…" />
      <p v-else-if="results.isError.value" class="d-sf__note">The search could not be run. Try again.</p>
      <p v-else-if="(results.data.value ?? []).length === 0" class="d-sf__note">Nobody has this reference or phone number. Only exact matches are found.</p>

      <div v-else class="d-sf__picks">
        <DBtn v-for="row in results.data.value" :key="row.id" @click="pick(row.id)">
          {{ row.fullName ?? 'Customer' }} · {{ row.displayRef }}
        </DBtn>
      </div>
    </div>

    <p v-if="view === 'customer' && !canSearch && !customerId" class="d-sf__note">
      Open a customer's file and choose "Wallet statement" to see one wallet. Finding customers needs the customer view permission.
    </p>
  </div>
</template>

<script lang="ts" setup>
  import type { StatementPeriodPreset } from './statementPeriods'
  import type { StatementGrain, StatementView } from '@/types/wallet'
  import { ref } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import FilterChips from '@/components/ui/FilterChips.vue'
  import FormField from '@/components/ui/FormField.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import { useCustomerSearchQuery } from '@/composables/useCustomerFile'
  import { PERIOD_OPTIONS } from './statementPeriods'

  defineProps<{
    view: StatementView
    period: StatementPeriodPreset
    from: string
    to: string
    grain: StatementGrain
    customerId: string | null
    // Searching customers needs customer.view (Finance does not hold it by default).
    canSearch: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:view', value: StatementView): void
    (e: 'update:period', value: StatementPeriodPreset): void
    // from / to are Cairo dates; pick carries the chosen customer's id.
    (e: 'update:from' | 'update:to' | 'pick', value: string): void
    (e: 'update:grain', value: StatementGrain): void
  }>()

  const viewOptions: Array<{ value: StatementView, label: string }> = [
    { value: 'customer', label: 'One customer wallet' },
    { value: 'customers', label: 'All customer wallets together' },
    { value: 'dahab', label: 'The Dahab wallet' },
  ]

  const GRAIN_OPTIONS: Array<{ value: StatementGrain, label: string }> = [
    { value: 'each', label: 'Every movement' },
    { value: 'day', label: 'One line per day' },
    { value: 'month', label: 'One line per month' },
  ]

  const term = ref('')
  const searchTerm = ref('')
  const results = useCustomerSearchQuery(searchTerm)

  function search () {
    searchTerm.value = term.value.trim()
  }

  function pick (id: string) {
    emit('pick', id)
    searchTerm.value = ''
    term.value = ''
  }
</script>

<style lang="scss" scoped>
.d-sf { display: grid; gap: 12px; }
.d-sf__row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.d-sf__find { display: flex; align-items: flex-end; gap: 8px; }
.d-sf__results { padding: 4px 0; }
.d-sf__picks { display: flex; flex-wrap: wrap; gap: 8px; }
.d-sf__note { font-size: 12.5px; color: var(--ink-3); margin: 0; }
</style>
