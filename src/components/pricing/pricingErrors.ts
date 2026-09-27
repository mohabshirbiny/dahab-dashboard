import { accessErrorMessage } from '@/components/staff/accessErrors'
import { backendCodeOf } from '@/services/errors'

// One sentence per Backend refusal on the pricing screens (Backend spec 005).
export function pricingErrorMessage (error: unknown): string {
  switch (backendCodeOf(error)) {
    case 'no_gold_price': {
      return 'No gold price is set yet. Enter both 24K prices first.'
    }
    case 'price_feed_healthy': {
      return 'The price feed is working, so a manual price is not accepted. It takes over automatically.'
    }
    case 'manual_price_not_pending': {
      return 'This price is no longer waiting: a newer price took effect, or its time ran out.'
    }
    case 'confirmer_must_differ': {
      return 'Someone other than the person who entered this price has to confirm it.'
    }
    case 'price_inverted': {
      return 'These adjustments would make buyers pay less than sellers get. Change them and try again.'
    }
  }
  return accessErrorMessage(error)
}
