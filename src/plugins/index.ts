import router from '../router'
import i18n from './i18n'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import installSessionExpiry from './session'
import installVueQuery from './vue-query'

import type { App } from 'vue'
import vuetify from './vuetify'

export function registerPlugins (app: App) {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)

  app.use(vuetify)
  app.use(pinia)
  app.use(i18n)
  app.use(router)
  installVueQuery(app)
  installSessionExpiry(router)
}
