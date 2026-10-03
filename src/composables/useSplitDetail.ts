import { nextTick, ref, watch } from 'vue'

// List + detail pages (Orders, Listings to review, Withdrawals). On screens where the
// detail sits under the list (`stackedAt` and below, the page's .d-split breakpoint),
// opening a row brings the detail into view once it has loaded (`loaded`), so the
// page is tall enough to scroll to it.
export function useSplitDetail (stackedAt: number, loaded: () => boolean) {
  const detail = ref<HTMLElement | null>(null)
  const waiting = ref(false)

  function scroll () {
    waiting.value = false
    if (window.innerWidth <= stackedAt) {
      detail.value?.scrollIntoView({ block: 'start' })
    }
  }

  watch(loaded, async ready => {
    if (ready && waiting.value) {
      await nextTick()
      scroll()
    }
  })

  // Call after the address carries the opened row.
  async function reveal () {
    await nextTick()
    if (loaded()) {
      scroll()
    } else {
      waiting.value = true
    }
  }

  return { detail, reveal }
}
