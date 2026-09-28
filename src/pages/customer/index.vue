<template>
  <div class="d-page">
    <PageLead>Find one person by their customer reference or phone number, whatever the state of their account.</PageLead>

    <Panel title="Find a customer">
      <template #filters>
        <form class="d-find" role="search" @submit.prevent="submit">
          <FormField v-slot="{ controlId }" label="Reference or phone">
            <DInput
              :id="controlId"
              v-model="input"
              autocomplete="off"
              :maxlength="32"
              placeholder="4417 or +20 10 1234 5678"
            />
          </FormField>

          <DBtn :disabled="input.trim() === ''" kind="primary" type="submit">Find</DBtn>
        </form>
      </template>

      <EmptyState
        v-if="q === ''"
        description="Type the full reference or the full phone number with its country code."
        title="Search for a customer"
      />

      <LoadingState v-else-if="isPending" label="Searching…" />

      <ErrorState
        v-else-if="isError"
        :message="failure === 'forbidden' ? 'Your account does not have permission to view customers.' : 'The search could not be run. Check your connection and try again.'"
        :retryable="failure !== 'forbidden'"
        title="Could not search"
        @retry="refetch()"
      />

      <EmptyState
        v-else-if="!data || data.length === 0"
        description="Nobody has this reference or phone number. Only exact matches are found."
        title="No customer found"
      />

      <DataTable v-else>
        <template #head>
          <th>Person</th>
          <th>Reference</th>
          <th>Phone</th>
          <th>Account</th>
          <th aria-label="Action" class="r" />
        </template>

        <tr v-for="row in data" :key="row.id">
          <td>{{ row.fullName ?? `Customer ${row.displayRef}` }}</td>
          <td class="mono">{{ row.displayRef }}</td>
          <td class="mono">{{ row.phone }}</td>
          <td><StatusTag :label="CUSTOMER_STATUS_META[row.status].label" :variant="CUSTOMER_STATUS_META[row.status].variant" /></td>

          <td class="r">
            <DBtn :aria-label="`Open the file of ${row.fullName ?? row.displayRef}`" kind="primary" @click="openFile(row.id)">Open file</DBtn>
          </td>
        </tr>
      </DataTable>
    </Panel>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FormField from '@/components/ui/FormField.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { useCustomerSearchQuery } from '@/composables/useCustomerFile'
  import { errorCodeOf } from '@/services/errors'
  import { CUSTOMER_STATUS_META } from '@/types/customer'

  // The term lives in the URL so Back from a file returns to the results.
  const route = useRoute()
  const router = useRouter()
  const q = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))
  const input = ref(q.value)
  watch(q, value => {
    input.value = value
  })

  const { data, error, isPending, isError, refetch } = useCustomerSearchQuery(q)
  const failure = computed(() => errorCodeOf(error.value))

  function openFile (id: string) {
    router.push({ name: 'customer-file', params: { id } })
  }

  function submit () {
    const term = input.value.trim()
    if (term !== '') {
      router.replace({ query: { q: term } })
    }
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-find { display: flex; align-items: flex-end; gap: 10px; max-width: 520px; }
.d-find :deep(.d-field) { flex: 1; }
</style>
