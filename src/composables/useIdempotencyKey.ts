// Idempotency-Key for one form (Backend spec 007, docs/platform/api-contract.md).
// Retrying the same submission reuses its key, so the Backend replays the first
// result instead of acting twice. Changing what is sent gets a new key, because
// the Backend refuses a key reused for a different request. `reset()` after a
// success, so the next action is a new one.
export function useIdempotencyKey () {
  let last: { body: string, key: string } | null = null

  return {
    keyFor (payload: unknown): string {
      const body = JSON.stringify(payload)
      if (last?.body !== body) {
        last = { body, key: crypto.randomUUID() }
      }
      return last.key
    },
    reset () {
      last = null
    },
  }
}
