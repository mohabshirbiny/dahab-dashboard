import { defineStore } from 'pinia'

interface ToastState {
  message: string
  visible: boolean
}

let hideTimer: ReturnType<typeof setTimeout> | null = null

export const useToastStore = defineStore('toast', {
  state: (): ToastState => ({
    message: '',
    visible: false,
  }),
  actions: {
    show (message: string, durationMs = 2600) {
      this.message = message
      this.visible = true
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        this.visible = false
      }, durationMs)
    },
    hide () {
      this.visible = false
      if (hideTimer) clearTimeout(hideTimer)
    },
  },
})
