<template>
  <div class="d-page">
    <PageLead>
      Founder-account security. A founder signing in from a new device waits here for the other founder's approval. Either founder can
      freeze the other at once; unfreezing takes two confirmations, and the founder who is not frozen always confirms last.
    </PageLead>

    <!-- Plan Q3: after a refusal, Freeze is offered — never done automatically. -->
    <NoteBanner v-if="refused" class="d-sec__offer" role="status" variant="wait">
      <span>
        You refused <b>{{ refused.founder.name }}</b>'s new device. If you think their account is being misused, freeze it.
      </span>

      <span class="d-sec__offer-actions">
        <DBtn kind="danger" @click="freezeTarget = refused.founder">Freeze {{ refused.founder.name }}</DBtn>
        <DBtn @click="refused = null">Dismiss</DBtn>
      </span>
    </NoteBanner>

    <PendingApprovals v-if="isFounder" @refused="row => (refused = row)" />

    <FreezePanel @freeze="target => (freezeTarget = target)" />

    <FounderDevices v-if="isFounder" />

    <SecurityHistory @freeze="target => (freezeTarget = target)" />

    <FreezeModal v-if="isFounder" :open="freezeTarget !== null" :target="freezeTarget" @close="onFreezeClosed" />
  </div>
</template>

<script lang="ts" setup>
  import type { DeviceApproval, StaffRefLite } from '@/types/security'
  import { computed, ref } from 'vue'
  import FounderDevices from '@/components/security/FounderDevices.vue'
  import FreezeModal from '@/components/security/FreezeModal.vue'
  import FreezePanel from '@/components/security/FreezePanel.vue'
  import PendingApprovals from '@/components/security/PendingApprovals.vue'
  import SecurityHistory from '@/components/security/SecurityHistory.vue'
  import DBtn from '@/components/ui/DBtn.vue'
  import NoteBanner from '@/components/ui/NoteBanner.vue'
  import PageLead from '@/components/ui/PageLead.vue'
  import { useAuthStore } from '@/stores/auth'

  // Backend spec 021: the Security page. Founders see everything; holders of
  // founder.unfreeze_second (the router lets them in) see only the freezes.
  const auth = useAuthStore()
  const isFounder = computed(() => Boolean(auth.user?.isFounder))

  const refused = ref<DeviceApproval | null>(null)
  const freezeTarget = ref<StaffRefLite | null>(null)

  function onFreezeClosed () {
    if (freezeTarget.value?.id === refused.value?.founder.id) {
      refused.value = null
    }
    freezeTarget.value = null
  }
</script>

<style lang="scss" scoped>
.d-sec__offer { margin-bottom: 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.d-sec__offer-actions { display: flex; gap: 6px; }
</style>
