import { defineStore } from 'pinia'

export interface AdminUser {
  username: string
  name: string
  role: string
}

const DEMO_USERNAME = 'admin'
const DEMO_PASSWORD = 'admin123'

interface AuthState {
  token: string | null
  user: AdminUser | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    loading: false,
  }),
  getters: {
    isAuthenticated: state => Boolean(state.token),
  },
  actions: {
    async login (username: string, password: string) {
      this.loading = true
      try {
        await new Promise(resolve => setTimeout(resolve, 400))
        const ok = username.trim().toLowerCase() === DEMO_USERNAME && password === DEMO_PASSWORD
        if (!ok) throw new Error('Invalid username or password')
        this.user = {
          username: DEMO_USERNAME,
          name: 'Ahmed Ezz El-Din',
          role: 'Chief Executive Officer',
        }
        this.token = btoa(`${username}:${Date.now()}`)
      } finally {
        this.loading = false
      }
    },
    logout () {
      this.token = null
      this.user = null
    },
  },
  persist: {
    key: 'vp_admin_auth',
    pick: ['token', 'user'],
  },
})
