<template>
  <div
    class="app-item-actions"
    :class="{ 'is-compact': !selected }"
    @click.stop
  >
    <div class="app-item-actions__main">
      <span class="app-item-actions__title">
        {{ $tt(appTitle) }}
      </span>

      <span
        class="app-item-actions__remove-wrap"
        @pointerdown.stop
      >
        <BngButton
          class="app-item-actions__remove"
          :accent="ACCENTS.text"
          :icon="icons.trashBin2"
          bng-no-nav="true"
          @click="onRemove"
        />
      </span>
    </div>

    <div v-if="selected" class="app-item-actions__width-sizer" aria-hidden="true">
      {{ $t("ui.appselect.noCockpit") }}
    </div>

    <div
      v-if="selected"
      class="app-item-actions__no-cockpit"
      @pointerdown.stop
    >
      <BngSwitch
        :model-value="noCockpit"
        always-opaque
        class="app-item-actions__switch"
        @valueChanged="onNoCockpitChanged"
      >
        {{ $t("ui.appselect.noCockpit") }}
      </BngSwitch>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { ACCENTS, BngButton, BngSwitch, icons } from "@/common/components/base"
import { openConfirmation } from "@/services/popup"
import { useAppLayoutsStore } from "../appLayoutsStore.js"

defineOptions({ name: "AppItemActions" })

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  rectPx: {
    type: Object,
    default: null,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const store = useAppLayoutsStore()

const appTitle = computed(() => props.item?.app?.name || props.item?.appName || "?")

const noCockpit = computed(() => !!props.item?.settings?.noCockpit)

const isEssential = computed(() => props.item?.app?.essential === true)

function onNoCockpitChanged(hidden) {
  store.setAppSettings(props.item.id, { noCockpit: hidden })
}

async function onRemove() {
  if (isEssential.value) {
    const ok = await openConfirmation(
      "Remove essential app",
      `"${appTitle.value}" is marked as essential. Remove it from the layout anyway?`
    ).catch(() => false)
    if (!ok) return
  }
  await store.removeApp(props.item.id)
}
</script>

<style lang="scss" scoped>
.app-item-actions {
  display: inline-grid;
  grid-template-columns: minmax(0, auto);
  justify-items: center;
  align-items: center;
  width: max-content;
  max-width: 100%;
  padding: 0.125em 0.25em;
  color: #fff;
  font-size: 1rem;
  pointer-events: auto;

  &.is-compact {
    display: inline-flex;
    width: auto;
    padding: 0.0625em 0.25em;
    font-size: 1rem;
  }
}

.app-item-actions__main {
  display: flex;
  align-items: center;
  gap: 0.25em;
  width: 100%;
  min-width: 0;
}

.app-item-actions__title {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 10em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.app-item-actions__width-sizer {
  max-width: 100%;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
  padding: 0 0.25em;
  box-sizing: border-box;
  font-size: 0.85em;
  white-space: normal;
}

.app-item-actions__no-cockpit {
  position: absolute;
  top: calc(100% + 0.125em);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.125em 0.25em;
}

.app-item-actions__switch {
  font-size: 0.85em;
  max-width: 100%;

  :deep(.bng-switch-label) {
    white-space: normal;
  }
}

.app-item-actions__remove-wrap {
  display: inline-flex;
}

.app-item-actions__remove {
  font-size: 0.85em;
  --bng-icon-color: #f00;
}
</style>
