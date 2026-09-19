import { defineStore } from 'pinia'

interface UIState {
  sidebarCollapsed: boolean
  locale: string
}

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    sidebarCollapsed: false,
    locale: 'en',
  }),
  actions: {
    toggleSidebar () {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    setLocale (locale: string) {
      this.locale = locale
    },
  },
  persist: {
    key: 'vp_admin_ui',
  },
})
