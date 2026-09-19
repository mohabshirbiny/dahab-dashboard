import { useToastStore } from '@/stores/toast'

export function useToast () {
  const store = useToastStore()
  return {
    ok: (message: string) => store.show(message),
    exportToExcel: (what: string) =>
      store.show(`Exporting ${what} to Excel. The file downloads when it is ready.`),
  }
}
