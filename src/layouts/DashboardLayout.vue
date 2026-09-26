<template>
  <v-navigation-drawer v-model="drawer" :rail="rail" permanent>
    <v-list-item
      nav
      prepend-icon="mdi-account-circle"
      :subtitle="auth.user ? roleSummary(auth.user.roles) : undefined"
      :title="auth.user?.name ?? 'Admin'"
    >
      <template #append>
        <v-btn
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          size="small"
          variant="text"
          @click.stop="rail = !rail"
        />
      </template>
    </v-list-item>

    <v-divider />

    <v-list density="compact" nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        :to="item.to"
      />
    </v-list>

    <template #append>
      <div class="pa-2">
        <v-btn
          block
          prepend-icon="mdi-logout"
          variant="tonal"
          @click="onLogout"
        >
          Logout
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>

  <v-app-bar border flat>
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>{{ currentTitle }}</v-app-bar-title>

    <v-spacer />

    <v-btn icon="mdi-bell-outline" />
    <v-menu>
      <template #activator="{ props }">
        <v-btn icon="mdi-dots-vertical" v-bind="props" />
      </template>
      <v-list>
        <v-list-item
          prepend-icon="mdi-logout"
          title="Logout"
          @click="onLogout"
        />
      </v-list>
    </v-menu>
  </v-app-bar>

  <v-main>
    <v-container class="pa-6" fluid>
      <router-view />
    </v-container>
  </v-main>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { roleSummary } from '@/types/staff'

  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const drawer = ref(true)
  const rail = ref(false)

  const navItems = [
    { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/dashboard' },
  ]

  const currentTitle = computed(() => {
    return navItems.find(i => i.to === route.path)?.title ?? 'Dashboard'
  })

  function onLogout () {
    auth.logout()
    router.replace({ name: 'login' })
  }
</script>
