<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" lg="4" md="5" sm="8">
        <div class="text-center mb-6">
          <v-avatar class="mb-3" color="primary" size="56">
            <v-icon icon="mdi-shield-account" size="32" />
          </v-avatar>
          <h1 class="text-h5 font-weight-bold">Admin Dashboard</h1>
          <p class="text-medium-emphasis mb-0">Sign in to continue</p>
        </div>

        <v-card class="pa-4" elevation="4" rounded="lg">
          <v-form ref="formRef" @submit.prevent="onSubmit">
            <v-text-field
              v-model="username"
              autocomplete="username"
              label="Username"
              prepend-inner-icon="mdi-account-outline"
              :rules="[required]"
              variant="outlined"
            />

            <v-text-field
              v-model="password"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              autocomplete="current-password"
              label="Password"
              prepend-inner-icon="mdi-lock-outline"
              :rules="[required]"
              :type="showPassword ? 'text' : 'password'"
              variant="outlined"
              @click:append-inner="showPassword = !showPassword"
            />

            <v-alert
              v-if="error"
              class="mb-4"
              density="compact"
              :text="error"
              type="error"
              variant="tonal"
            />

            <v-btn
              block
              color="primary"
              :loading="auth.loading"
              size="large"
              type="submit"
            >
              Sign In
            </v-btn>
          </v-form>

          <p class="text-caption text-medium-emphasis text-center mt-4 mb-0">
            Demo credentials — <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'

  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
  const username = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const error = ref('')

  function required (v: string) {
    return !!v || 'This field is required'
  }

  async function onSubmit () {
    error.value = ''
    const result = await formRef.value?.validate()
    if (!result?.valid) return

    try {
      await auth.login(username.value, password.value)
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard/overview'
      router.replace(redirect)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed'
    }
  }
</script>
