<template>
  <Panel subtitle="Oldest first" title="Needs a decision">
    <EmptyState v-if="rows.length === 0" title="Nothing is waiting on a decision" />

    <DataTable v-else>
      <template #head>
        <th>What</th>
        <th>Waiting</th>
        <th>Where it is worked</th>
        <th class="r" />
      </template>

      <tr v-for="row in rows" :key="row.id">
        <td>
          {{ row.what }}
          <div class="who2">{{ row.whoSub }}</div>
        </td>

        <td><StatusTag :label="formatRelativeTime(row.waitingSince)" :variant="row.waitingVariant" /></td>
        <td>{{ row.onWho }}</td>

        <td class="r">
          <DBtn kind="primary" @click="router.push(row.ctaTarget)">{{ row.ctaLabel }}</DBtn>
        </td>
      </tr>
    </DataTable>
  </Panel>
</template>

<script lang="ts" setup>
  import type { NeedsDecisionRow } from '@/types/overview'
  import { useRouter } from 'vue-router'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import EmptyState from '@/components/ui/EmptyState.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { formatRelativeTime } from '@/composables/useFormatters'

  // Only the kinds the viewer can act on (Backend spec 015 FR-016), labelled by area, never by role.
  defineProps<{ rows: NeedsDecisionRow[] }>()
  const router = useRouter()
</script>

<style lang="scss" scoped>
.who2 { font-size: 11px; color: var(--ink-3); }
</style>
