import type { InvoiceQuery, IssueCreditNoteInput } from '@/types/invoice'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { invoiceService } from '@/services/invoice.service'
import { retryTransient } from './queryRetry'
import { download, financeKeys } from './useFinance'
import { walletKeys } from './useWallet'

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (query: InvoiceQuery) => [...invoiceKeys.all, 'list', query] as const,
  detail: (id: string | null) => [...invoiceKeys.all, 'detail', id ?? 'none'] as const,
  creditNotes: (from: string, to: string, q: string) => [...invoiceKeys.all, 'credit-notes', from, to, q] as const,
}

export function useInvoicesQuery (query: MaybeRefOrGetter<InvoiceQuery>) {
  return useInfiniteQuery({
    queryKey: computed(() => invoiceKeys.list({ ...toValue(query) })),
    queryFn: ({ pageParam }) => invoiceService.list(toValue(query), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    retry: retryTransient,
  })
}

export function useInvoiceQuery (id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => invoiceKeys.detail(toValue(id))),
    queryFn: () => invoiceService.show(toValue(id) as string),
    enabled: computed(() => toValue(id) !== null),
    retry: retryTransient,
  })
}

export function useCreditNotesQuery (from: MaybeRefOrGetter<string>, to: MaybeRefOrGetter<string>, q: MaybeRefOrGetter<string>) {
  return useInfiniteQuery({
    queryKey: computed(() => invoiceKeys.creditNotes(toValue(from), toValue(to), toValue(q))),
    queryFn: ({ pageParam }) => invoiceService.creditNotes(toValue(from), toValue(to), toValue(q), pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor,
    retry: retryTransient,
  })
}

export function useExportInvoices () {
  return useMutation({ mutationFn: async (query: InvoiceQuery) => download(await invoiceService.exportCsv(query)) })
}

// Open a PDF the Backend made (staff views are audited there) in a new tab.
export function useOpenTaxDocument () {
  return useMutation({
    mutationFn: async (doc: { kind: 'invoice' | 'credit_note', id: string, number: string }) => {
      const file = doc.kind === 'invoice' ? await invoiceService.invoicePdf(doc.id, doc.number) : await invoiceService.creditNotePdf(doc.id, doc.number)
      const url = URL.createObjectURL(file.blob)
      const opened = window.open(url, '_blank')
      if (!opened) {
        download({ blob: file.blob, filename: file.filename, truncated: false })
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      return file
    },
  })
}

// A credit note moves money: the invoices, the wallets and the finance figures all change.
export function useIssueCreditNote () {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { invoiceId: string, body: IssueCreditNoteInput, idempotencyKey: string }) =>
      invoiceService.issueCreditNote(input.invoiceId, input.body, input.idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      queryClient.invalidateQueries({ queryKey: financeKeys.all })
      queryClient.invalidateQueries({ queryKey: walletKeys.all })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}
