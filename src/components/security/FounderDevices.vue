<template>
  <Panel subtitle="A sign-in from one of these is not held" title="Known founder devices">
    <LoadingState v-if="devices.isPending.value" label="Loading devices…" />

    <ErrorState
      v-else-if="devices.isError.value"
      :message="securityErrorMessage(devices.error.value)"
      title="Could not load the devices"
      @retry="devices.refetch()"
    />

    <DataTable v-else>
      <template #head>
        <th>Founder</th>
        <th>Device</th>
        <th>Known since</th>
        <th>Last sign-in</th>
      </template>

      <template v-for="founder in devices.data.value ?? []" :key="founder.founder.id">
        <tr v-if="founder.devices.length === 0">
          <td><b>{{ founder.founder.name }}</b></td>
          <td class="who2" colspan="3">No known device yet: every sign-in is held for approval.</td>
        </tr>

        <tr v-for="(device, index) in founder.devices" :key="`${founder.founder.id}-${device.deviceRef}`">
          <td><b v-if="index === 0">{{ founder.founder.name }}</b></td>
          <td class="mono">{{ formatDeviceRef(device.deviceRef) }}</td>
          <td class="nowrap">{{ formatDateTime(device.firstSeenAt) }}</td>
          <td class="nowrap">{{ formatRelativeTime(device.lastSeenAt) }}</td>
        </tr>
      </template>
    </DataTable>

    <template #footer>
      <p class="who2">Devices are never removed here. After a confirmed compromise, removing one is part of the manual recovery.</p>
    </template>
  </Panel>
</template>

<script lang="ts" setup>
  import DataTable from '@/components/ui/DataTable.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import { formatDateTime, formatRelativeTime } from '@/composables/useFormatters'
  import { useFounderDevicesQuery } from '@/composables/useSecurity'
  import { formatDeviceRef, securityErrorMessage } from './securityErrors'

  // Backend spec 021: each founder's known devices, by ref only.
  const devices = useFounderDevicesQuery()
</script>

<style lang="scss" scoped>
.who2 { font-size: 11px; color: var(--ink-3); margin: 0; }
</style>
