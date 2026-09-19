<template>
  <Panel title="Needs a decision" subtitle="Oldest first">
    <DataTable>
      <template #head>
        <th>What</th>
        <th>Waiting</th>
        <th>Who it is on</th>
        <th class="r" />
      </template>
      <tr v-for="row in rows" :key="row.id">
        <td>
          {{ row.what }}
          <div class="who2">{{ row.whoSub }}</div>
        </td>
        <td><StatusTag :label="row.waitingLabel" :variant="row.waitingVariant" /></td>
        <td>{{ row.onWho }}</td>
        <td class="r">
          <DBtn kind="primary" @click="onCta(row.ctaTarget)">{{ row.ctaLabel }}</DBtn>
        </td>
      </tr>
    </DataTable>
  </Panel>
</template>

<script lang="ts" setup>
  import { useRouter } from 'vue-router'
  import Panel from '@/components/ui/Panel.vue'
  import DataTable from '@/components/ui/DataTable.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import type { NeedsDecisionRow } from '@/types/overview'

  defineProps<{ rows: NeedsDecisionRow[] }>()
  const router = useRouter()

  function onCta (target: string) {
    router.push(target)
  }
</script>
