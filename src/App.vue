<template>
  <v-app>
    <AuthLoading v-if="auth.isInitializing" />
    <router-view v-else />
  </v-app>
</template>

<script lang="ts" setup>
  import AuthLoading from '@/components/auth/AuthLoading.vue'
  import { useAuthStore } from '@/stores/auth'

  const auth = useAuthStore()
</script>
