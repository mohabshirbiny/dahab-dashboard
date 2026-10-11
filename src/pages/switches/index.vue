<template>
  <div class="d-page">
    <PageLead>Stop or pause what customers can start, and choose what they can see. Anything with a locked price always finishes, and no money moves from here.</PageLead>

    <LoadingState v-if="switches.isPending.value" label="Loading the switches…" />
    <ErrorState v-else-if="switches.isError.value" :message="contentErrorMessage(switches.error.value)" title="Could not load the switches" @retry="switches.refetch()" />

    <template v-else-if="data">
      <NoteBanner v-if="data.stopEverything.active" class="d-sw__note" variant="bad">
        Everything is stopped{{ data.stopEverything.setBy ? ` by ${data.stopEverything.setBy.fullName}` : '' }}: {{ data.stopEverything.reason }}
      </NoteBanner>

      <NoteBanner v-if="actionError" class="d-sw__note" role="alert" variant="bad">{{ actionError }}</NoteBanner>

      <Panel class="d-sw__block" subtitle="One state per category" title="Categories">
        <DataTable>
          <template #head>
            <th>Category</th>
            <th>State</th>
            <th class="r">Live</th>
            <th class="r">Nobody asked</th>
            <th class="r">Price locked</th>
            <th class="r" />
          </template>

          <tr v-for="c in data.categories" :key="c.category">
            <td>{{ CATEGORY_LABEL[c.category] }}</td>

            <td>
              <StatusTag v-if="c.state === 'open'" label="Open" variant="ok" />
              <StatusTag v-else :label="LEVEL_LABEL[c.state]" variant="wait" />

              <div v-for="x in c.controls" :key="x.level" class="who2">
                {{ LEVEL_LABEL[x.level] }}: {{ x.reason }}{{ x.setBy ? `, ${x.setBy.fullName}` : '' }}
              </div>
            </td>

            <td class="r">{{ c.liveCount }}</td>
            <td class="r">{{ c.noRequestCount }}</td>
            <td class="r">{{ c.priceLockedCount }}</td>

            <td class="r d-sw__actions">
              <template v-for="lv in CATEGORY_LEVELS" :key="lv">
                <DBtn v-if="isOn(c, lv)" :disabled="busy || !allowed(lv)" @click="onClear(lv, c.category)">
                  Reopen ({{ SHORT[lv] }})
                </DBtn>

                <DBtn v-else :disabled="busy || !allowed(lv)" @click="openSet(lv, c.category)">{{ SHORT[lv] }}</DBtn>
              </template>
            </td>
          </tr>
        </DataTable>
      </Panel>

      <Panel class="d-sw__block" subtitle="Founders only" title="Stop everything">
        <p class="d-sw__lead">
          No new listings, buy requests or withdrawals, and no release of a held withdrawal. A customer can still cancel a pending withdrawal; money already held stays held.
        </p>

        <DBtn v-if="data.stopEverything.active" :disabled="busy || !allowed('stop_everything')" kind="primary" @click="onClear('stop_everything', null)">
          Start everything again
        </DBtn>

        <DBtn v-else :disabled="busy || !allowed('stop_everything')" kind="danger" @click="openSet('stop_everything', null)">Stop everything</DBtn>
      </Panel>

      <Panel class="d-sw__block" subtitle="Pricing is not affected" title="What customers can see">
        <ul class="d-sw__vis">
          <li v-for="item in VISIBILITY_ITEMS" :key="item.key">
            <label>
              <input
                :checked="data.visibility[item.key]"
                :disabled="busy || !canVisibility"
                type="checkbox"
                @change="onVisibility(item.key, ($event.target as HTMLInputElement).checked)"
              >
              {{ item.label }}
            </label>

            <div class="who2">{{ item.hint }}</div>
          </li>
        </ul>
      </Panel>
    </template>

    <DModal v-model="setOpen" :max-width="560" :persistent="setting.isPending.value" :title="dialogTitle">
      <p class="d-sw__lead">The reason is kept in the audit log. The message is what customers read; leave it empty to use the standard wording.</p>

      <FormField v-slot="{ controlId, describedBy }" :error="reasonError" label="Reason">
        <DInput :id="controlId" v-model="reason" :describedby="describedBy" :disabled="setting.isPending.value" />
      </FormField>

      <FormField v-slot="{ controlId, describedBy }" label="Message to customers, English">
        <DTextarea
          :id="controlId"
          v-model="messageEn"
          :describedby="describedBy"
          :disabled="setting.isPending.value"
          :rows="3"
        />
      </FormField>

      <FormField v-slot="{ controlId, describedBy }" label="Message to customers, Arabic">
        <DTextarea
          :id="controlId"
          v-model="messageAr"
          class="d-sw__ar"
          :describedby="describedBy"
          dir="rtl"
          :disabled="setting.isPending.value"
          :rows="3"
        />
      </FormField>

      <NoteBanner v-if="setError" class="d-sw__note" role="alert" variant="bad">{{ setError }}</NoteBanner>

      <template #actions>
        <DBtn :disabled="setting.isPending.value" @click="setOpen = false">Cancel</DBtn>
        <DBtn kind="primary" :loading="setting.isPending.value" @click="onSet">Switch on</DBtn>
      </template>
    </DModal>
  </div>
</template>

<script lang="ts" setup>
  import type { CategoryState, ControlCategory, ControlLevel, VisibilityKey } from '@/types/controls'
  import type { Permission } from '@/types/staff'
  import { computed, ref } from 'vue'
  import { contentErrorMessage } from '@/components/content/contentErrors'
  import DataTable from '@/components/ui/DataTable.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import DInput from '@/components/ui/DInput.vue'
  import DModal from '@/components/ui/DModal.vue'
  import DTextarea from '@/components/ui/DTextarea.vue'
  import ErrorState from '@/components/ui/ErrorState.vue'
  import FormField from '@/components/ui/FormField.vue'
  import LoadingState from '@/components/ui/LoadingState.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import Panel from '@/components/ui/Panel.vue'
  import StatusTag from '@/components/ui/StatusTag.vue'
  import { useClearControl, useSetControl, useSetVisibility, useSwitchesQuery } from '@/composables/useControls'
  import { useIdempotencyKey } from '@/composables/useIdempotencyKey'
  import { usePermissions } from '@/composables/usePermissions'
  import { useToast } from '@/composables/useToast'
  import { CATEGORY_LABEL, LEVEL_LABEL, VISIBILITY_ITEMS } from '@/types/controls'

  // Switches (Backend spec 019 US7). Each level is its own permission; the Backend re-checks.
  const CATEGORY_LEVELS: ControlLevel[] = ['stop_new_listings', 'pause_category']
  const SHORT: Record<ControlLevel, string> = { stop_new_listings: 'Stop new', pause_category: 'Pause', stop_everything: 'Stop everything' }
  const PERMISSION: Record<ControlLevel, Permission> = {
    stop_new_listings: 'category.stop_new',
    pause_category: 'category.pause',
    stop_everything: 'platform.stop_everything',
  }

  const { can } = usePermissions()
  const toast = useToast()
  const switches = useSwitchesQuery()
  const data = computed(() => switches.data.value)
  const allowed = (level: ControlLevel) => can(PERMISSION[level])
  const canVisibility = computed(() => can('visibility.manage'))
  const isOn = (c: CategoryState, level: ControlLevel) => c.controls.some(x => x.level === level)

  const setting = useSetControl()
  const clearing = useClearControl()
  const visibility = useSetVisibility()
  const busy = computed(() => setting.isPending.value || clearing.isPending.value || visibility.isPending.value)
  const key = useIdempotencyKey()
  const actionError = ref('')

  const setOpen = ref(false)
  const level = ref<ControlLevel>('stop_new_listings')
  const category = ref<ControlCategory | null>(null)
  const reason = ref('')
  const messageEn = ref('')
  const messageAr = ref('')
  const reasonError = ref('')
  const setError = ref('')
  const dialogTitle = computed(() => `${SHORT[level.value]}${category.value ? `: ${CATEGORY_LABEL[category.value]}` : ''}`)

  function openSet (l: ControlLevel, c: ControlCategory | null) {
    level.value = l
    category.value = c
    reason.value = ''
    messageEn.value = ''
    messageAr.value = ''
    reasonError.value = ''
    setError.value = ''
    setOpen.value = true
  }

  function onSet () {
    reasonError.value = reason.value.trim() === '' ? 'A reason is required.' : ''
    if (reasonError.value) return
    const values = { level: level.value, category: category.value, reason: reason.value.trim(), messageEn: messageEn.value.trim(), messageAr: messageAr.value.trim() }
    setError.value = ''
    setting.mutate({ values, idempotencyKey: key.keyFor(values) }, {
      onSuccess: () => {
        key.reset()
        setOpen.value = false
        toast.ok('Switched on.')
      },
      onError: error => {
        setError.value = contentErrorMessage(error)
      },
    })
  }

  function onClear (l: ControlLevel, c: ControlCategory | null) {
    actionError.value = ''
    clearing.mutate({ level: l, category: c, idempotencyKey: key.keyFor([l, c]) }, {
      onSuccess: () => {
        key.reset()
        toast.ok('Switched off.')
      },
      onError: error => {
        actionError.value = contentErrorMessage(error)
      },
    })
  }

  function onVisibility (k: VisibilityKey, shown: boolean) {
    actionError.value = ''
    visibility.mutate({ key: k, shown, idempotencyKey: key.keyFor([k, shown]) }, {
      onSuccess: () => {
        key.reset()
        toast.ok('Saved.')
      },
      onError: error => {
        actionError.value = contentErrorMessage(error)
      },
    })
  }
</script>

<style lang="scss" scoped>
.d-page { display: block; }
.d-sw__block { margin-top: 16px; }
.d-sw__note { margin: 12px 0; }
.d-sw__lead { margin: 0 0 12px; color: var(--ink-2); font-size: 13px; }
.d-sw__ar { text-align: right; }
.d-sw__actions { white-space: nowrap; }
.d-sw__actions > * + * { margin-left: 4px; }
.d-sw__vis { list-style: none; margin: 0; padding: 12px 16px; }
.d-sw__vis li { padding: 8px 0; border-bottom: 1px solid var(--line); }
</style>
