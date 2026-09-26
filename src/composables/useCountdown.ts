import { computed, type MaybeRefOrGetter, onScopeDispose, ref, toValue, watch } from 'vue'

// Seconds left until an ISO timestamp, ticking once a second.
export function useCountdown (until: MaybeRefOrGetter<string | null | undefined>) {
  const now = ref(Date.now())
  const timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  onScopeDispose(() => clearInterval(timer))

  const secondsLeft = computed(() => {
    const target = toValue(until)
    if (!target) {
      return 0
    }
    return Math.max(0, Math.ceil((Date.parse(target) - now.value) / 1000))
  })

  // A new target restarts from the real clock rather than the last tick.
  watch(() => toValue(until), () => {
    now.value = Date.now()
  })

  const label = computed(() => {
    const m = Math.floor(secondsLeft.value / 60)
    const s = secondsLeft.value % 60
    return `${m}:${String(s).padStart(2, '0')}`
  })

  return { secondsLeft, label, expired: computed(() => secondsLeft.value <= 0) }
}
