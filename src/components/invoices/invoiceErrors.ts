import { financeErrorMessage } from '@/components/finance/financeErrors'
import { formatMoney } from '@/composables/useFormatters'
import { backendCodeOf, isServiceError } from '@/services/errors'

// One sentence per Backend refusal on the Invoices page (Backend spec 016).
export function invoiceErrorMessage (error: unknown): string {
  const details = isServiceError(error) ? error.details : {}
  switch (backendCodeOf(error)) {
    case 'credit_exceeds_invoice': {
      const remaining = typeof details.remaining === 'string' ? formatMoney(details.remaining) : null
      return remaining ? `That is more than is left on this invoice: ${remaining} EGP.` : 'That is more than is left on this invoice.'
    }
    case 'invoice_not_creditable': {
      return 'Only a seller invoice can be credited. Dahab charged the buyer nothing to correct.'
    }
    case 'document_not_ready': {
      return 'This document is being prepared. Try again in a few minutes.'
    }
  }
  return financeErrorMessage(error)
}
