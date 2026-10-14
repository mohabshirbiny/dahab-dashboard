<template>
  <DModal
    :max-width="620"
    :model-value="invoiceId !== null"
    :title="invoice ? `Invoice ${invoice.number}` : 'Invoice'"
    @update:model-value="close"
  >
    <LoadingState v-if="detail.isPending.value" label="Loading the invoice…" />
    <ErrorState v-else-if="detail.isError.value" :message="invoiceErrorMessage(detail.error.value)" title="Could not load the invoice" @retry="detail.refetch()" />

    <template v-else-if="invoice">
      <KeyValueRow label="Issued" :value="formatDateTime(invoice.issuedAt)" />
      <KeyValueRow label="Order" :value="invoice.orderRef" />

      <KeyValueRow :label="invoice.party === 'seller' ? 'Seller' : 'Buyer'">
        <span class="mono">{{ invoice.customer.displayRef ?? '—' }}</span> {{ invoice.customer.name ?? '' }}
      </KeyValueRow>

      <KeyValueRow label="Piece" :value="piece" />

      <h3 class="d-idm__h">{{ invoice.party === 'seller' ? 'Settlement' : 'Price' }}</h3>

      <!-- Backend package C item 13: the price difference is Dahab's commission (VAT 0); the total is unchanged. -->
      <template v-if="invoice.party === 'buyer' && invoice.lines.priceDifference !== null">
        <KeyValueRow :label="`Gold value at ${formatMoney(invoice.lines.sellerUnitRate)} per gram`" :value="formatMoney(invoice.lines.goldValueAtSellerRate)" />
        <KeyValueRow label="Commission" :value="formatMoney(invoice.lines.priceDifference)" />
        <KeyValueRow label="Making charge" :value="formatMoney(invoice.lines.makingTotal)" />
      </template>

      <template v-else-if="invoice.lines.goldValue !== null">
        <KeyValueRow :label="`Gold value at ${formatMoney(invoice.lines.unitRate)} per gram`" :value="formatMoney(invoice.lines.goldValue)" />
        <KeyValueRow label="Making charge" :value="formatMoney(invoice.lines.makingTotal)" />
      </template>

      <KeyValueRow v-else label="Price of the piece" :value="formatMoney(invoice.lines.askingPrice)" />
      <KeyValueRow big :label="invoice.party === 'seller' ? 'Gross' : 'Total paid'" :value="formatMoney(invoice.lines.subtotal)" />

      <template v-if="invoice.party === 'seller'">
        <h3 class="d-idm__h">Dahab charges</h3>
        <!-- Backend package C: since then the rate includes VAT, which is carved out of it. -->
        <KeyValueRow
          :label="invoice.lines.commissionVatInclusive ? `Commission before VAT (${invoice.lines.commissionPct ?? '—'}%, VAT included)` : `Commission (${invoice.lines.commissionPct ?? '—'}%)`"
          :value="formatMoney(invoice.net)"
        />

        <KeyValueRow :label="`VAT at ${Number(invoice.vatRate)}%`" :value="formatMoney(invoice.vat)" />
        <KeyValueRow big :label="invoice.lines.commissionVatInclusive ? 'Commission, VAT included' : 'Total charges'" :value="formatMoney(invoice.gross)" />
        <KeyValueRow label="Paid to the seller's wallet" :value="formatMoney(invoice.lines.paidToWallet)" />
      </template>

      <KeyValueRow v-else label="VAT" :value="formatMoney(invoice.vat)" />

      <h3 class="d-idm__h">Credit notes</h3>
      <p v-if="invoice.creditNotes.length === 0" class="who2">None. {{ formatMoney(invoice.remaining) }} EGP can still be credited.</p>

      <div v-for="n in invoice.creditNotes" :key="n.id" class="d-idm__cn">
        <div>
          <span class="mono">{{ n.number }}</span> · {{ formatDate(n.issuedAt, true) }} · {{ n.issuedBy?.name ?? '' }}
          <div class="who2">{{ n.reason }}</div>
        </div>

        <span class="mono">− {{ formatMoney(n.gross) }}</span>
        <DBtn :loading="opening === n.id" @click="openPdf('credit_note', n.id, n.number)">PDF</DBtn>
      </div>

      <NoteBanner v-if="pdfError" class="d-idm__banner" variant="wait">{{ pdfError }}</NoteBanner>
      <p v-if="!invoice.issuer" class="who2">Dahab's legal details are not configured yet, so the PDF is still waiting.</p>
    </template>

    <template #actions>
      <DBtn @click="close(false)">Close</DBtn>
      <DBtn v-if="invoice && canCorrect && invoice.creditable" @click="crediting = true">Issue a credit note</DBtn>
      <DBtn v-if="invoice" kind="primary" :loading="opening === invoice.id" @click="openPdf('invoice', invoice.id, invoice.number)">Open the PDF</DBtn>
    </template>
  </DModal>

  <IssueCreditNoteModal v-if="invoice" :invoice="invoice" :open="crediting" @close="crediting = false" />
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DModal from '@/components/ui/DModal.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import KeyValueRow from '@/components/ui/KeyValueRow.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import { formatDate, formatDateTime, formatMoney } from '@/composables/useFormatters'
  import { useInvoiceQuery, useOpenTaxDocument } from '@/composables/useInvoices'
  import { usePermissions } from '@/composables/usePermissions'
  import { PERMISSIONS } from '@/types/staff'
  import { invoiceErrorMessage } from './invoiceErrors'
  import IssueCreditNoteModal from './IssueCreditNoteModal.vue'

  // One tax invoice (Backend spec 016 FR-012): its lines, credit notes and PDF (each PDF view is
  // audited by the Backend). A credit note needs invoice.correct and a seller invoice with something left.
  const props = defineProps<{ invoiceId: string | null }>()
  const emit = defineEmits<{ (e: 'close'): void }>()

  const { can } = usePermissions()
  const canCorrect = computed(() => can(PERMISSIONS.invoiceCorrect))

  const detail = useInvoiceQuery(() => props.invoiceId)
  const invoice = computed(() => detail.data.value ?? null)
  const crediting = ref(false)

  const opener = useOpenTaxDocument()
  const opening = ref<string | null>(null)
  const pdfError = ref('')

  const piece = computed(() => {
    const l = invoice.value?.lines
    if (!l) return ''
    return [l.pieceTypeEn, l.karatLabel, l.weightG ? `${Number(l.weightG)} g` : null].filter(Boolean).join(', ')
  })

  watch(() => props.invoiceId, () => {
    crediting.value = false
    pdfError.value = ''
  })

  function close (value: boolean) {
    if (!value) emit('close')
  }

  async function openPdf (kind: 'invoice' | 'credit_note', id: string, number: string) {
    pdfError.value = ''
    opening.value = id
    try {
      await opener.mutateAsync({ kind, id, number })
    } catch (error) {
      pdfError.value = invoiceErrorMessage(error)
    } finally {
      opening.value = null
    }
  }
</script>

<style lang="scss" scoped>
.d-idm__h { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-3); margin: 18px 0 6px; }
.d-idm__cn { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
.d-idm__banner { margin-top: 12px; }
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
