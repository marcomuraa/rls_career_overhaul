<template>
  <LayoutSingle
    class="layout-content-full layout-align-hstart"
    v-bng-scoped-nav="{ activateOnMount: true, trapPolicy: SCOPE_TRAP_POLICIES.ALWAYS, canDeactivate: canDeactivateScope }"
    v-bng-on-ui-nav:menu,back="exitAdjustmentMode"
    v-bng-on-ui-nav:action_2="() => selectedMirror && exitAdjustmentMode()">
    <BngCard class="mirrors-card" v-bng-blur="true">
      <BngCardHeading>{{ $t("ui.mirrors.name") }}</BngCardHeading>
      <div v-if="!selectedMirror" class="content buttons-grid">
        <BngImageTile
          v-for="(mirror, index) in mirrors"
          :key="index"
          :class="[mirror.position]"
          :icon="icons[mirror.mirrorIcon] || icons.placeholder"
          :label="mirror.description"
          :bng-scoped-nav-autofocus="mirror.position === 'left'"
          bng-nav-item
          class="mirror-button"
          @click="selectedMirror = mirror"
          />
      </div>
      <MirrorAdjust v-else class="content" :mirror="selectedMirror" @deactivate="selectedMirror = null" />
      <template #buttons>
        <BngButton bng-no-nav="true" @click="exitAdjustmentMode">
          <BngBinding v-if="selectedMirror" controller ui-event="action_2" />
          <BngBinding v-else controller ui-event="back" />
          {{ $t(selectedMirror ? 'ui.common.apply' : 'ui.common.close') }}
        </BngButton>
      </template>
    </BngCard>
  </LayoutSingle>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useBridge } from "@/bridge"
import { LayoutSingle } from "@/common/layouts"
import { vBngBlur, vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { BngBinding, BngButton, BngCard, BngCardHeading, BngImageTile, icons } from "@/common/components/base"
import { $translate } from "@/services/translation"
import { SCOPE_TRAP_POLICIES } from "@/services/scopedNav/types"
import MirrorAdjust from "../components/MirrorAdjust.vue"

const comp = ref(null)
const { lua, events } = useBridge()

const mirrors = ref([])

const selectedMirror = ref(null)

const props = defineProps({
  exitRoute: {
    type: String,
    default: "menu.vehicleconfig.tuning",
  },
})

async function exitAdjustmentMode() {
  if (selectedMirror.value) {
    // Deselect the mirror and show the selection again
    lua.extensions.core_vehicle_mirror.setAngleOffset(selectedMirror.value.name, -selectedMirror.value.y, -selectedMirror.value.x, false, true)
    selectedMirror.value = null
    comp.value = null // Ensure the dynamic component is not rendered
    await lua.extensions.core_vehicle_mirror.focusOnMirror(false)
  } else {
    // await lua.extensions.ui_router.navigate(props.exitRoute)
    await lua.extensions.ui_router.back()
  }
}

async function getVehicleMirrors() {
  const data = await lua.extensions.core_vehicle_mirror.getAnglesOffset()
  mirrors.value.splice(0)
  for (const key in data) {
    let position = data[key].position
    let mirrorIcon = data[key].icon
    let description = data[key].label // like in parts, we're expecting this property to hold a readable mirror name
    if (!position) {
      if (/_L$|_L_/.test(key)) {
        position = "left"
        if (!mirrorIcon) mirrorIcon = "mirrorLeftDefault"
      } else if (/_R$|_R_/.test(key)) {
        position = "right"
        if (!mirrorIcon) mirrorIcon = "mirrorRightDefault"
      } else {
        // default mirror position
        position = "mid"
      }
    }
    // display name builder
    if (!description) {
      description = $translate.instant("ui.mirrors.position." + position)
      if (key.endsWith("_spot")) description += ` (${$translate.instant("ui.mirrors.spot")})`
      // description += "\n" + data[key].name
      // console.log(key, data[key].name, "-", description)
    } else {
      let tr = $translate.instant("ui.mirrors." + description)
      if (!tr.startsWith("ui.mirrors.")) {
        description = tr
      }
    }
    mirrors.value.push({
      name: data[key].name,
      description,
      position,
      x: data[key].angleOffset.x,
      y: data[key].angleOffset.z,
      clampX: data[key].clampX,
      clampY: data[key].clampZ,
      mirrorIcon: mirrorIcon || "mirrorInteriorMiddle",
      row: data[key].row || 0,
    })
  }
  mirrors.value.sort((a, b) => a.row - b.row)
}

const canDeactivateScope = () => {
  return !selectedMirror.value
}

onMounted(async () => {
  await getVehicleMirrors()
  events.on("VehicleChange", getVehicleMirrors)
  lua.extensions.core_input_bindings.setMenuActionEnabled(true, "menu_item_focus_lr")
  lua.extensions.core_input_bindings.setMenuActionEnabled(true, "menu_item_focus_ud")
})
onUnmounted(() => {
  events.off("VehicleChange", getVehicleMirrors)
})
</script>

<style lang="scss" scoped>
.mirrors-card {
  max-width: 80rem;
  color: #fff;
  .buttons-grid {
    display: grid;
    grid-template-columns: [left] minmax(auto, 1fr) [mid] minmax(auto, 1fr) [right] minmax(auto, 1fr);
    grid-auto-flow: dense;
    gap: 0.5rem;
    .tile.mirror-button {
      display: flex;
      &.left {
        grid-column-start: left;
      }

      &.mid-left {
        grid-column-start: mid-left;
      }
      &.mid {
        grid-column-start: mid;
      }
      &.mid-right {
        grid-column-start: mid-right;
      }
      &.right {
        grid-column-start: right;
      }
      :deep(.glyph) {
        font-size: 4rem;
      }
    }
  }
}
</style>
