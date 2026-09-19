<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">
          Welcome back, {{ auth.user?.name }}
        </h1>
        <p class="text-medium-emphasis mb-0">Here's what's happening today.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus">New Report</v-btn>
    </div>

    <v-row>
      <v-col
        v-for="stat in stats"
        :key="stat.label"
        cols="12"
        md="3"
        sm="6"
      >
        <v-card border flat rounded="lg">
          <v-card-text class="d-flex align-center ga-4">
            <v-avatar
              :color="stat.color"
              rounded="lg"
              size="48"
              variant="tonal"
            >
              <v-icon :icon="stat.icon" size="24" />
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
              <div class="text-caption" :class="stat.trend >= 0 ? 'text-success' : 'text-error'">
                <v-icon :icon="stat.trend >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down'" size="14" />
                {{ Math.abs(stat.trend) }}% vs last week
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" md="8">
        <v-card border flat rounded="lg">
          <v-card-title class="text-subtitle-1 font-weight-bold">Recent Activity</v-card-title>
          <v-divider />
          <v-list lines="two">
            <v-list-item
              v-for="a in activity"
              :key="a.id"
              :prepend-icon="a.icon"
              :subtitle="a.time"
              :title="a.title"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card border flat rounded="lg">
          <v-card-title class="text-subtitle-1 font-weight-bold">Quick Links</v-card-title>
          <v-divider />
          <v-list nav>
            <v-list-item prepend-icon="mdi-account-multiple-outline" title="Manage Users" />
            <v-list-item prepend-icon="mdi-cog-outline" title="Settings" />
            <v-list-item prepend-icon="mdi-file-chart-outline" title="Reports" />
            <v-list-item prepend-icon="mdi-shield-key-outline" title="Permissions" />
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
  import { useAuthStore } from '@/stores/auth'

  const auth = useAuthStore()

  const stats = [
    { label: 'Total Users', value: '2,431', icon: 'mdi-account-group', color: 'primary', trend: 12 },
    { label: 'Revenue', value: '$48.2k', icon: 'mdi-currency-usd', color: 'success', trend: 8 },
    { label: 'Orders', value: '1,210', icon: 'mdi-cart-outline', color: 'info', trend: -3 },
    { label: 'Pending', value: '37', icon: 'mdi-clock-outline', color: 'warning', trend: -5 },
  ]

  const activity = [
    { id: 1, icon: 'mdi-account-plus', title: 'New admin "Sara" was added', time: '2 hours ago' },
    { id: 2, icon: 'mdi-file-document-outline', title: 'Monthly report generated', time: '5 hours ago' },
    { id: 3, icon: 'mdi-shield-check', title: 'Security settings updated', time: 'Yesterday' },
    { id: 4, icon: 'mdi-cart', title: '24 new orders processed', time: 'Yesterday' },
  ]
</script>
