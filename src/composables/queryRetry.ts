import { errorCodeOf, isServiceError } from '@/services/errors'

// Retrying a 403 or 404 only delays the message. Transient failures get one more try.
export function retryTransient (failureCount: number, error: unknown): boolean {
  const code = errorCodeOf(error)
  const transient = !isServiceError(error) || code === 'network' || code === 'unknown'
  return transient && failureCount < 1
}
