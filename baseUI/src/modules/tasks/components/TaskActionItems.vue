<template>
  <div v-if="actionItems.length" class="action-items-row">
    <div v-for="(actionItem, i) in actionItems" :key="`task-action-${i}`" class="action-item">
      <BngBinding :action="actionItem.action" show-unassigned class="action-item-binding" />
      <span class="action-item-label">{{ $t(actionItem.label) }}</span>
    </div>
  </div>
</template>

<script setup>
import { BngBinding } from "@/common/components/base"

defineProps({
  actionItems: {
    type: Array,
    default: () => [],
  },
})
</script>

<style scoped lang="scss">
.action-items-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em 0.6em;
  margin-top: 0.35em;
  border-top: 1px solid rgba(var(--bng-off-white-rgb), 0.25);
  padding-top: 0.25rem;

  > .action-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
  }

  .action-item-label {
    font-family: var(--fnt-defs);
  }
}
</style>
