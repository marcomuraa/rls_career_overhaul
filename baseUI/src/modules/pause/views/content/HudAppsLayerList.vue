<template>
  <section class="hud-apps-layer-list">
    <div class="hud-apps-layer-list__header">
      <h3>{{ $t("ui.hudApps.appsInLayout") }}</h3>
      <p>{{ $t("ui.hudApps.appCount", { count: rows.length }) }}</p>
    </div>

    <p v-if="loading" class="hud-apps-layer-list__empty">
      {{ $t("ui.common.loading") }}
    </p>
    <div v-else class="hud-apps-layer-list__rows">
      <slot name="before-rows" />
      <p v-if="rows.length === 0" class="hud-apps-layer-list__empty">
        {{ $t("ui.hudApps.noAppsInLayout") }}
      </p>
      <template v-else>
        <HudAppsLayerRow
          v-for="(row, index) in rows"
          :key="row.key || row.id"
          :row="row"
          :autofocus="isRowAutofocus(row, index)"
          @select="emit('select', $event)"
          @delete="emit('delete', $event)"
          @hover="emit('hover', $event)"
        />
      </template>
    </div>
  </section>
</template>

<script setup>
import { useSlots } from "vue"
import HudAppsLayerRow from "./HudAppsLayerRow.vue"

defineOptions({ name: "HudAppsLayerList" })

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  autofocusId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(["select", "delete", "hover"])
const slots = useSlots()

function isRowAutofocus(row, index) {
  if (props.autofocusId != null) return String(row.id) === String(props.autofocusId)
  return !slots["before-rows"] && index === 0
}
</script>

<style scoped lang="scss">
.hud-apps-layer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  min-height: 0;
}

.hud-apps-layer-list__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75em;
  padding: 0 0.5em;

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 1em;
    font-weight: 600;
  }

  p {
    color: var(--bng-cool-gray-200);
    font-size: 0.85em;
  }
}

.hud-apps-layer-list__rows {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding:0.125em;
}

.hud-apps-layer-list__empty {
  margin: 0;
  padding: 0.75em;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.45);
  color: var(--bng-cool-gray-200);
}
</style>
