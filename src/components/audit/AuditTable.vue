<template>
  <DataTable>
    <template #head>
      <th>When</th>
      <th>Who</th>
      <th>What</th>
      <th>Before</th>
      <th>After</th>
      <th>Origin</th>
      <th aria-label="Details" class="r" />
    </template>

    <tr v-for="entry in rows" :key="entry.id">
      <td class="mono d-at__when">{{ formatDateTime(entry.at) }}</td>
      <td>{{ actorLabel(entry.actor) }}</td>

      <td>
        {{ entry.label }}
        <StatusTag v-if="entry.outcome && entry.outcome !== 'success'" :label="entry.outcome" variant="bad" />
        <div v-if="entry.subject" class="who2">{{ entry.subject }}</div>
      </td>

      <td class="mono d-at__value" :title="entry.beforeSummary ?? undefined">{{ entry.beforeSummary ?? '—' }}</td>
      <td class="mono d-at__value" :title="entry.afterSummary ?? undefined">{{ entry.afterSummary ?? '—' }}</td>
      <td class="mono">{{ entry.ip ?? '—' }}</td>

      <td class="r">
        <DBtn :aria-label="`Details of ${entry.label}`" @click="emit('open', entry.id)">Details</DBtn>
      </td>
    </tr>
  </DataTable>
</template>

<script lang="ts" setup>
  import type { AuditEntry } from '@/types/audit'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatDateTime } from '@/composables/useFormatters'
  import { actorLabel } from '@/types/audit'

  defineProps<{ rows: readonly AuditEntry[] }>()

  const emit = defineEmits<{ (e: 'open', id: number): void }>()
</script>

<style lang="scss" scoped>
.d-at__when { white-space: nowrap; }
.d-at__value { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
