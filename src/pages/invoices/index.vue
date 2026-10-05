<template>
  <div class="d-page">
    <PageLead>
      Invoices are issued automatically at settlement, one to the seller and one to the buyer. Nobody issues them by hand.
      An issued invoice cannot be edited, so a mistake is corrected with a credit note that reverses it.
      E-invoicing with the Tax Authority is not connected yet.
    </PageLead>

    <StatGrid v-if="figures">
      <StatCard hint="Both sides of each sale" label="Issued this month" :value="String(figures.issuedCount)" />
      <StatCard hint="Dahab's commission on seller invoices" label="Net invoiced" :value="`${formatMoney(figures.netInvoiced)} EGP`" />
      <StatCard hint="On commission only, less credit notes" label="VAT collected" :value="`${formatMoney(figures.vatCollected)} EGP`" />
      <StatCard :hint="`${formatMoney(figures.creditNotesAmount)} EGP corrected`" label="Credit notes" :value="String(figures.creditNotesCount)" />
    </StatGrid>

    <Panel class="d-inv__block" title="Invoices">
      <template #actions>
        <DBtn :loading="exporting.isPending.value" @click="exportList">Export to Excel</DBtn>
      </template>

      <template #filters>
        <PeriodFilter v-model:from="from" v-model:to="to" />
        <DSelect v-model="party" aria-label="Party" :options="PARTY_FILTER" />
        <DSelect v-model="status" aria-label="Status" :options="STATUS_FILTER" />
        <DInput v-model="search" aria-label="Search" placeholder="Search number, order or customer" />
      </template>

      <NoteBanner v-if="exportNote" class="d-inv__note" variant="bad">{{ exportNote }}</NoteBanner>

      <LoadingState v-if="list.isPending.value" label="Loading invoices…" />
      <ErrorState v-else-if="list.isError.value" :message="invoiceErrorMessage(list.error.value)" title="Could not load invoices" @retry="list.refetch()" />
      <EmptyState v-else-if="rows.length === 0" title="No invoices in these dates" />

      <template v-else>
        <InvoicesTable :rows="rows" @open="openId = $event" />

        <div v-if="list.hasNextPage.value" class="d-inv__more">
          <DBtn :loading="list.isFetchingNextPage.value" @click="list.fetchNextPage()">Load more</DBtn>
        </div>
      </template>
    </Panel>

    <Panel class="d-inv__block" subtitle="Each one reverses an invoice that was already issued" title="Credit notes">
      <NoteBanner v-if="pdfError" class="d-inv__note" variant="wait">{{ pdfError }}</NoteBanner>

      <LoadingState v-if="notes.isPending.value" label="Loading credit notes…" />
      <ErrorState v-else-if="notes.isError.value" :message="invoiceErrorMessage(notes.error.value)" title="Could not load credit notes" @retry="notes.refetch()" />
      <EmptyState v-else-if="noteRows.length === 0" title="No credit notes in these dates" />

      <template v-else>
        <CreditNotesTable :opening="opening" :rows="noteRows" @pdf="openNote" />

        <div v-if="notes.hasNextPage.value" class="d-inv__more">
          <DBtn :loading="notes.isFetchingNextPage.value" @click="notes.fetchNextPage()">Load more</DBtn>
        </div>
      </template>
    </Panel>

    <InvoiceDetailModal :invoice-id="openId" @close="openId = null" />
  </div>
</template>

<script lang="ts" setup>
  import type { CreditNote, InvoiceParty, InvoiceQuery, InvoiceStatus } from '@/types/invoice'
  import { computed, ref, watch } from 'vue'
  import PeriodFilter from '@/components/finance/PeriodFilter.vue'
  import CreditNotesTable from '@/components/invoices/CreditNotesTable.vue'
  import InvoiceDetailModal from '@/components/invoices/InvoiceDetailModal.vue'
  import { invoiceErrorMessage } from '@/components/invoices/invoiceErrors'
  import InvoicesTable from '@/components/invoices/InvoicesTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DSelect from '@/components/ui/DSelect.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatCard from '@/components/ui/StatCard.vue'
  import StatGrid from '@/components/ui/StatGrid.vue'
  import { formatMoney } from '@/composables/useFormatters'
  import { useCreditNotesQuery, useExportInvoices, useInvoicesQuery, useOpenTaxDocument } from '@/composables/useInvoices'
  import { cairoDate } from '@/types/audit'
  import { INVOICE_STATUSES } from '@/types/invoice'

  // Invoices (Backend spec 016 US2, invoice.view): the month's figures, every invoice with its
  // status from credit notes, the CSV export, the credit notes, and each invoice's detail and PDF.
  const PARTY_FILTER: ReadonlyArray<{ value: InvoiceParty | '', label: string }> = [
    { value: '', label: 'Both sides' },
    { value: 'seller', label: 'Seller invoices' },
    { value: 'buyer', label: 'Buyer invoices' },
  ]
  const STATUS_FILTER: ReadonlyArray<{ value: InvoiceStatus | '', label: string }> = [{ value: '', label: 'Every status' }, ...INVOICE_STATUSES]

  const from = ref(cairoDate(29))
  const to = ref(cairoDate())
  const party = ref<InvoiceParty | ''>('')
  const status = ref<InvoiceStatus | ''>('')
  const search = ref('')
  const q = ref('')
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(search, value => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      q.value = value.trim()
    }, 300)
  })
  const query = computed<InvoiceQuery>(() => ({ from: from.value, to: to.value, party: party.value, status: status.value, q: q.value }))

  const list = useInvoicesQuery(query)
  const rows = computed(() => list.data.value?.pages.flatMap(p => p.rows) ?? [])
  const figures = computed(() => list.data.value?.pages[0]?.figures.month ?? null)

  const notes = useCreditNotesQuery(from, to, '')
  const noteRows = computed(() => notes.data.value?.pages.flatMap(p => p.rows) ?? [])

  const openId = ref<string | null>(null)

  const exporting = useExportInvoices()
  const exportNote = ref('')

  function exportList () {
    exportNote.value = ''
    exporting.mutate(query.value, {
      onSuccess: result => {
        exportNote.value = result.truncated ? 'The file stopped at the export limit. Narrow the dates to get the rest.' : ''
      },
      onError: error => {
        exportNote.value = invoiceErrorMessage(error)
      },
    })
  }

  const opener = useOpenTaxDocument()
  const opening = ref<string | null>(null)
  const pdfError = ref('')

  async function openNote (note: CreditNote) {
    pdfError.value = ''
    opening.value = note.id
    try {
      await opener.mutateAsync({ kind: 'credit_note', id: note.id, number: note.number })
    } catch (error) {
      pdfError.value = invoiceErrorMessage(error)
    } finally {
      opening.value = null
    }
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-inv__block { margin-top: 16px; }
.d-inv__note { margin: 0 16px 12px; }
.d-inv__more { display: flex; justify-content: center; padding: 12px; }
</style>
