<template>
  <Teleport to="body">
    <div class="tuning-debug-apps-panel" :class="{ 'two-column': twoColumns }">
      <BngDrawer v-model="expanded" :header="$t('ui.vehicleconfig.tuning')" @change="onExpandedChange">
        <template #header-controls>
          <BngButton
            accent="text"
            :icon="twoColumns ? icons.listSmall : icons.tiles"
            @click="toggleColumns"
          />
        </template>
        <template #expanded-content>
          <div class="tuning-debug-apps-list">
            <div class="tuning-debug-apps-column">
              <AdvancedWheelsDebug />
              <EngineDebug />
              <div ref="powerTrainWrapperRef" class="power-train-wrapper">
                <PowerTrainDebug :rect-px="powerTrainRect" />
              </div>
            </div>
            <div class="tuning-debug-apps-column">
              <EngineThermalDebug />
            </div>
          </div>
        </template>
      </BngDrawer>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from "vue"
import { BngDrawer, BngButton, icons } from "@/common/components/base"
import { AdvancedWheelsDebug, PowerTrainDebug, EngineDebug, EngineThermalDebug } from "@/modules/apps"

defineOptions({ name: "TuningDebugAppsPanel" })

const STORAGE_KEY = "showTuningDebugApps"
const COLUMNS_STORAGE_KEY = "tuningDebugAppsTwoColumns"

const expanded = ref(false)
try {
  expanded.value = !!JSON.parse(localStorage.getItem(STORAGE_KEY))
} catch (err) { }

const twoColumns = ref(false)
try {
  twoColumns.value = !!JSON.parse(localStorage.getItem(COLUMNS_STORAGE_KEY))
} catch (err) { }

function onExpandedChange(val) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(!!val))
}

function toggleColumns() {
  twoColumns.value = !twoColumns.value
  localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(twoColumns.value))
}

function toggle() {
  expanded.value = !expanded.value
}

defineExpose({ toggle })

// #region power train
// measure the size to pass into PowerTrainDebug
const powerTrainWrapperRef = ref(null)
const powerTrainRect = ref({ width: 0, height: 0 })
let powerTrainResizeObserver = null

function measurePowerTrainRect() {
  const el = powerTrainWrapperRef.value
  if (!el) return
  const { width, height } = el.getBoundingClientRect()
  if (width > 0 && height > 0) {
    powerTrainRect.value = { width, height }
  }
}

watch(powerTrainWrapperRef, el => {
  powerTrainResizeObserver?.disconnect()
  powerTrainResizeObserver = null
  if (!el) return
  measurePowerTrainRect()
  powerTrainResizeObserver = new ResizeObserver(measurePowerTrainRect)
  powerTrainResizeObserver.observe(el)
}, { immediate: true })

onBeforeUnmount(() => powerTrainResizeObserver?.disconnect())
// #endregion power train
</script>

<style scoped lang="scss">
.tuning-debug-apps-panel {
  position: fixed;
  top: 20%;
  right: 0;
  width: 380px;
  z-index: 10;

  &.two-column {
    width: 660px;

    .tuning-debug-apps-list {
      flex-direction: row;
      align-items: flex-start;
    }
  }
}

.tuning-debug-apps-list {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.5em;
}

.tuning-debug-apps-column {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
  gap: 0.5em;

  > * {
    min-height: unset !important;
  }
}

.power-train-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
}
</style>
