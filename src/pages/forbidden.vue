<template>
  <StatusPage
    code="403"
    description="Your account does not include the permission this page needs. If you should have access, ask a founder to update your permissions."
    title="You do not have access to this page"
  >
    <template #actions>
      <DBtn kind="primary" @click="router.replace({ name: 'overview' })">Go to overview</DBtn>
    </template>
  </StatusPage>
</template>

<script lang="ts" setup>
  import { useRouter } from 'vue-router'
  import DBtn from '@/components/ui/DBtn.vue'
  import StatusPage from '@/components/ui/StatusPage.vue'

  const router = useRouter()
</script>
