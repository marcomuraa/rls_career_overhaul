<template>
  <div class="sb-list">
      <SessionBrowserListRow
        v-for="(row, idx) in sessions"
        :key="rowKey(row, idx)"
        :name="row.name"
        :level="row.level"
        :players="row.players"
        :preview="row.preview"
        :state="row.state"
        :source="row.source"
        :last-joined-ago="row.lastJoinedAgo"
        :actionable="row.actionable !== false"
        @click="$emit('select', row, idx)"
      />
  </div>
</template>

<script setup>
import SessionBrowserListRow from "./SessionBrowserListRow.vue"

defineOptions({ name: "SessionBrowserList" })

defineProps({
  sessions: {
    type: Array,
    default: () => [],
  },
})

defineEmits(["select"])

function rowKey(row, idx) {
  return row.key ?? row.id ?? row.name ?? idx
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.sb-list {
  --sb-cols: minmax(8rem, 10rem) minmax(0, 1fr) minmax(7rem, 9rem);

  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  gap: 0.35em;
}

.sb-list-head {
  display: grid;
  grid-template-columns: var(--sb-cols);
  gap: 0;
  align-items: center;
  padding: 0.35em 0;
  font-size: calc-ui-rem(0.72);
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--bng-off-white-rgb), 0.45);
  border-bottom: 1px solid rgba(var(--bng-off-white-rgb), 0.12);
}

.sb-list-col--end {
  text-align: right;
  padding-right: 0.5em;
}

</style>
