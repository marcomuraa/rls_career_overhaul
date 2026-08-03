<template>
  <BngRow
    ref="rowRef"
    :data-app-id="row.id"
    v-bng-ui-nav-label:context="row.selected || row.hovered ? $t('ui.common.delete') : null"
    class="hud-apps-layer-row"
    :class="{
      'hud-apps-layer-row--selected': row.selected,
      'hud-apps-layer-row--hovered': row.hovered,
      'hud-apps-layer-row--active': row.selected || row.hovered,
    }"
    @mouseenter="emitHover"
    @mouseleave="emitClearHover"
    @focusin="emitHover"
    @focusout="emitClearHover"
    @uinav-focus="emitHover"
    @uinav-blur="emitClearHover"
    :bng-scoped-nav-autofocus="autofocus ? 'true' : null"
    no-unused-navigation
    @activate="emitSelect"
  >
    <RowContextAction :on-context="onDeleteNav" />
    <div class="hud-apps-layer-row__content">
      <div class="hud-apps-layer-row__text">
        <span class="hud-apps-layer-row__title">{{ $tt(displayName) }}</span>
        <!-- <span class="hud-apps-layer-row__subtitle">
          <span v-if="placementSummary">{{ placementSummary }}</span>
          <span v-else class="hud-apps-layer-row__placement-empty">{{ $t("ui.hudApps.noPlacement") }}</span>
        </span> -->
      </div>

      <div class="hud-apps-layer-row__actions">
        <Button
          type="button"
          class="hud-apps-layer-row__action is-danger"
          :title="$t('ui.common.delete')"
          tabindex="-1"
          @click.stop="emitDelete"
        >
          <BngBinding
            class="hud-apps-layer-row__binding"
            ui-event="context"
            controller
            track-ignore
          />
          <BngIcon class="hud-apps-layer-row__action-icon" :type="icons.trashBin2" />
          <span class="hud-apps-layer-row__action-label">{{ $t("ui.common.delete") }}</span>
        </Button>
      </div>
    </div>
  </BngRow>
</template>

<script setup>
import { computed, defineComponent, inject, nextTick, onBeforeUnmount, onMounted, ref } from "vue"
import { BngBinding, BngIcon, BngRow, icons } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngUiNavLabel } from "@/common/directives"

defineOptions({ name: "HudAppsLayerRow" })

// hack to register a `context` action on the parent BngRow via its api
// this is to avoid colliding with a second v-bng-on-ui-nav:context on it
// TODO: improve bngrow
const RowContextAction = defineComponent({
  name: "RowContextAction",
  props: {
    onContext: {
      type: Function,
      default: undefined,
    },
  },
  setup(props) {
    const row = inject("BngRow", null)
    if (row) {
      const api = {
        context: () => (props.onContext ? props.onContext() : true),
      }
      row.register(api)
      onBeforeUnmount(() => row.unregister(api))
    }
    return () => null
  },
})

const props = defineProps({
  row: {
    type: Object,
    required: true,
  },
  autofocus: {
    type: Boolean,
    default: false,
  },
})

const rowRef = ref(null)

onMounted(async () => {
  if (!props.autofocus) return
  await nextTick()
  rowRef.value?.$el?.scrollIntoView?.({ block: "center", inline: "nearest" })
})

const emit = defineEmits(["select", "delete", "hover"])

const displayName = computed(() => props.row?.displayNameToken || props.row?.displayNameFallback || props.row?.appName || "?")
const placementSummary = computed(() => {
  const snapshot = props.row?.placementSnapshot
  if (!snapshot) return ""
  const x = placementPart(snapshot.left?.raw ?? snapshot.right?.raw)
  const y = placementPart(snapshot.top?.raw ?? snapshot.bottom?.raw)
  const width = placementPart(snapshot.width?.raw)
  const height = placementPart(snapshot.height?.raw)
  return `Pos: ${formatPair(x, y)}, Size: ${formatPair(width, height)}`
})

function placementPart(value) {
  if (value === undefined || value === null || value === "") return "?"
  return String(value)
}

function splitPlacementUnit(value) {
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(.*)$/)
  if (!match) return null
  return {
    number: match[1],
    unit: match[2],
  }
}

function formatPair(first, second) {
  const a = splitPlacementUnit(first)
  const b = splitPlacementUnit(second)
  if (a && b && a.unit && a.unit === b.unit) {
    return `${a.number}×${b.number}${b.unit}`
  }
  return `${first}×${second}`
}

function emitSelect() {
  emit("select", props.row)
}

function emitDelete() {
  emit("delete", props.row)
}

function emitHover() {
  emit("hover", props.row)
}

function emitClearHover() {
  emit("hover", null)
}

function onDeleteNav() {
  emitDelete()
  return false
}
</script>

<style scoped lang="scss">
.hud-apps-layer-row {
  min-width: 0;

  &--selected {
    --bng-bg-image: linear-gradient(
      to top,
      var(--bng-orange-550) 0,
      var(--bng-orange-550) 0.25em,
      transparent 0.25em
    );
  }

  &--hovered {
    --bng-bg-enabled: var(--bng-orange-550);
    --bng-bg-focus: var(--bng-orange-550);
    --bng-bg-border-enabled: var(--bng-orange-550);
    --bng-bg-border-focus: var(--bng-orange-550);
    --bng-bg-border-width: 0.0625em;
  }

  &:not(.hud-apps-layer-row--active) {
    .hud-apps-layer-row__actions {
      opacity: 0;
      pointer-events: none;
    }
  }
}

.hud-apps-layer-row__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  gap: 0.75em;
  min-height: 1.75em;
}

.hud-apps-layer-row__text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.hud-apps-layer-row__title {
  overflow: hidden;
  color: var(--bng-off-white);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hud-apps-layer-row__subtitle {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  gap: 0.35em;
  color: var(--bng-cool-gray-200);
  font-size: 0.85em;
}

.hud-apps-layer-row__placement-empty {
  color: var(--bng-cool-gray-300);
}

.hud-apps-layer-row__actions {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  justify-content: flex-end;
  flex: 0 0 auto;
  transition: opacity 0.12s ease-out;
}

.hud-apps-layer-row__action {
  --bng-icon-color: currentColor;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25em;
  max-width: 10em;
  padding: 0.125em 0.375em;
  border: 0;
  border-radius: var(--bng-corners-1);
  color: var(--bng-off-white);
  background: rgba(var(--bng-off-black-rgb), 0.35);
  font: inherit;
  cursor: pointer;

  &.is-danger {
    color: var(--bng-add-red-200);
  }
}

.hud-apps-layer-row__binding,
.hud-apps-layer-row__action-icon {
  flex: 0 0 auto;
}

.hud-apps-layer-row__binding {
  font-size: 0.75em;
}

.hud-apps-layer-row__action-icon {
  --bng-icon-size: 1.25em;
}

.hud-apps-layer-row__action-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
