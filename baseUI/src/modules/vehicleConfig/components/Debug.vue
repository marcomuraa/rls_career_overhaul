<template>
  <div class="veh-debug" v-bng-ui-nav-scroll>
    <BngRow v-for="toggle in controls.vehicle.toggleGroup_1" :key="toggle.key" class="control-switch-row">
      <template #label>{{ $tt(toggle.label) }}</template>
      <BngSwitch v-model="geState[toggle.key]" @valueChanged="toggle.onChange()" />
    </BngRow>

    <div class="buttons">
      <BngButton
        v-for="btn in controls.vehicle.buttonGroup_1"
        :key="btn.label"
        @click="btn.action()"
        :disabled="disableVehicleButtons"
        :accent="ACCENTS.secondary"
        >{{ $tt(btn.label) }}</BngButton
      >
    </div>

    <hr />

    <h4>{{ $tt("ui.debug.vehicle.jbeamVis") }}</h4>

    <div class="jbeamvis-controls">
      <template v-for="ctrl in controls.jbeamvis.controls_1" :key="ctrl.label">
        <BngRow v-if="ctrl.component === 'switch'" class="control-switch-row">
          <template #label>{{ $tt(ctrl.label) }}</template>
          <BngSwitch :model-value="ctrl.model.value" @valueChanged="ctrl.onChange" />
        </BngRow>
        <BngButton v-else-if="ctrl.component === 'button'" :accent="ctrl.accent" @click="ctrl.action()">{{ $tt(ctrl.label) }}</BngButton>
      </template>
    </div>

    <!-- Part selector -->
    <div class="parts-selector">
      <BngRow class="control-switch-row">
        <template #label>{{ $tt("ui.debug.vehicle.toggleAllParts") }}</template>
        <BngSwitch
          v-model="selectAllParts"
          :class="{ 'switch-indeterminate': partsSelectedIndeterminate() }"
          @onClicked="partsSelectedClicked" />
      </BngRow>
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.partsSelected") }}</template>
        <BngDropdownContainer class="bng-select-fullwidth">
          <BngList :layout="LIST_LAYOUTS.LIST" :target-width="31">
            <BngInput v-model.trim="partsSelectedSearchTerm" :floating-label="$t('ui.debug.vehicle.partsSelectedSearchText')" />
            <div v-if="partsFiltered && partsFiltered.length > 0">
              <BngSwitch
                v-for="part in partsFiltered"
                v-bng-tooltip:right="part.label + ' \\ ' + part.reversePath"
                :model-value="part.selected"
                :key="part.value"
                :label-alignment="LABEL_ALIGNMENTS.START"
                :inline="false"
                class="parts-switch"
                @change="value => partsSelectedChanged(part.value, value)">
                <span class="parts-switch-label">
                  <strong>{{ part.label }}</strong> {{ part.reversePath ? "\\" + part.reversePath : "" }}
                </span>
              </BngSwitch>
            </div>
          </BngList>
        </BngDropdownContainer>
      </BngRow>
    </div>

    <template v-if="state.vehicle">
      <!-- Beam Text Mode -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.beamText") }}</template>
        <BngDropdown v-model="state.vehicle.beamTextMode" :items="beamTextModeItems" @valueChanged="applyState" />
      </BngRow>

      <!-- Beam Visualization Mode -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.beamVis") }}</template>
        <BngDropdown v-model="state.vehicle.beamVisMode" :items="beamVisModeItems" @valueChanged="applyState" />
      </BngRow>

      <!-- Visualization Controls -->
      <div v-if="currentBeamVisMode && currentBeamVisMode.usesRange">
        <!-- Range Min -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMin") }}</template>
            <BngSlider
              v-model="currentBeamVisMode.rangeMin"
              :min="currentBeamVisMode.rangeMinCap"
              :max="currentBeamVisMode.rangeMaxCap"
              :step="(currentBeamVisMode.rangeMaxCap - currentBeamVisMode.rangeMinCap) / 100"
              :input-step="(currentBeamVisMode.rangeMaxCap - currentBeamVisMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentBeamVisMode.rangeMinEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Range Max -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMax") }}</template>
            <BngSlider
              v-model="currentBeamVisMode.rangeMax"
              :min="currentBeamVisMode.rangeMinCap"
              :max="currentBeamVisMode.rangeMaxCap"
              :step="(currentBeamVisMode.rangeMaxCap - currentBeamVisMode.rangeMinCap) / 100"
              :input-step="(currentBeamVisMode.rangeMaxCap - currentBeamVisMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentBeamVisMode.rangeMaxEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Inclusive Range -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.useInclusiveRange") }}</template>
          <BngSwitch v-model="currentBeamVisMode.usesInclusiveRange" @valueChanged="applyState" />
        </BngRow>

        <!-- Show Infinity -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.showInf") }}</template>
          <BngSwitch v-model="currentBeamVisMode.showInfinity" @valueChanged="applyState" />
        </BngRow>
      </div>

      <!-- Highlighted beams, width and transparency controls -->
      <template v-if="state.vehicle.beamVisMode !== 1">
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.showHighlighted") }}</template>
          <BngSwitch v-model="state.vehicle.beamVisShowHighlighted" :disabled="state.vehicle.beamVisMode === 3" @valueChanged="applyState" />
        </BngRow>

        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.width") }}</template>
          <BngSlider v-model="state.vehicle.beamVisWidthScale" :min="0.1" :max="5" :step="0.1" with-input @valueChanged="applyState" />
        </BngRow>

        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.transparency") }}</template>
          <BngSlider v-model="state.vehicle.beamVisAlpha" :min="0" :max="1" :step="0.01" with-input @valueChanged="applyState" />
        </BngRow>
      </template>

      <!-- Node Text Mode -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.nodeText") }}</template>
        <BngDropdown v-model="state.vehicle.nodeTextMode" :items="nodeTextModeItems" @valueChanged="applyState" />
      </BngRow>

      <!-- Visualization Controls -->
      <div v-if="currentNodeTextMode && currentNodeTextMode.usesRange">
        <!-- Range Min -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMin") }}</template>
            <BngSlider
              v-model="currentNodeTextMode.rangeMin"
              :min="currentNodeTextMode.rangeMinCap"
              :max="currentNodeTextMode.rangeMaxCap"
              :step="(currentNodeTextMode.rangeMaxCap - currentNodeTextMode.rangeMinCap) / 100"
              :input-step="(currentNodeTextMode.rangeMaxCap - currentNodeTextMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentNodeTextMode.rangeMinEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Range Max -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMax") }}</template>
            <BngSlider
              v-model="currentNodeTextMode.rangeMax"
              :min="currentNodeTextMode.rangeMinCap"
              :max="currentNodeTextMode.rangeMaxCap"
              :step="(currentNodeTextMode.rangeMaxCap - currentNodeTextMode.rangeMinCap) / 100"
              :input-step="(currentNodeTextMode.rangeMaxCap - currentNodeTextMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentNodeTextMode.rangeMaxEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Inclusive Range -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.useInclusiveRange") }}</template>
          <BngSwitch v-model="currentNodeTextMode.usesInclusiveRange" @valueChanged="applyState" />
        </BngRow>

        <!-- Show Infinity -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.showInf") }}</template>
          <BngSwitch v-model="currentNodeTextMode.showInfinity" @valueChanged="applyState" />
        </BngRow>
      </div>

      <!-- Node text max distance -->
      <BngRow class="control-slider-row indented" v-if="state.vehicle.nodeTextMode !== 1">
        <template #label>{{ $tt("ui.debug.vehicle.maxDist") }}</template>
        <BngSlider v-model="state.vehicle.nodeTextMaxDist" :min="0.1" :max="state.vehicle.nodeTextMaxDistCap" :step="0.1" with-input @valueChanged="applyState" />
      </BngRow>

      <!-- Show Wheels -->
      <BngRow class="control-switch-row indented" v-if="state.vehicle.nodeTextMode !== 1">
        <template #label>{{ $tt("ui.debug.vehicle.showWheels") }}</template>
        <BngSwitch v-model="state.vehicle.nodeTextShowWheels" @valueChanged="applyState" />
      </BngRow>

      <!-- Node Debug Text Mode -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.nodeDebugText") }}</template>
        <BngDropdown
          v-model="state.vehicle.nodeDebugTextMode"
          :items="nodeDebugTextModeItems"
          long-names="cut"
          @valueChanged="applyState" />
      </BngRow>

      <!-- Node Visualization Mode -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.nodeVis") }}</template>
        <BngDropdown v-model="state.vehicle.nodeVisMode" :items="nodeVisModeItems" @valueChanged="applyState" />
      </BngRow>

      <!-- Visualization Controls -->
      <div v-if="currentNodeVisMode && currentNodeVisMode.usesRange">
        <!-- Range Min -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMin") }}</template>
            <BngSlider
              v-model="currentNodeVisMode.rangeMin"
              :min="currentNodeVisMode.rangeMinCap"
              :max="currentNodeVisMode.rangeMaxCap"
              :step="(currentNodeVisMode.rangeMaxCap - currentNodeVisMode.rangeMinCap) / 100"
              :input-step="(currentNodeVisMode.rangeMaxCap - currentNodeVisMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentNodeVisMode.rangeMinEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Range Max -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMax") }}</template>
            <BngSlider
              v-model="currentNodeVisMode.rangeMax"
              :min="currentNodeVisMode.rangeMinCap"
              :max="currentNodeVisMode.rangeMaxCap"
              :step="(currentNodeVisMode.rangeMaxCap - currentNodeVisMode.rangeMinCap) / 100"
              :input-step="(currentNodeVisMode.rangeMaxCap - currentNodeVisMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentNodeVisMode.rangeMaxEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Inclusive Range -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.useInclusiveRange") }}</template>
          <BngSwitch v-model="currentNodeVisMode.usesInclusiveRange" @valueChanged="applyState" />
        </BngRow>

        <!-- Show Infinity -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.showInf") }}</template>
          <BngSwitch v-model="currentNodeVisMode.showInfinity" @valueChanged="applyState" />
        </BngRow>
      </div>

      <!-- Highlighted nodes, width and transparency controls -->
      <template v-if="state.vehicle.nodeVisMode !== 1">
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.showHighlighted") }}</template>
          <BngSwitch v-model="state.vehicle.nodeVisShowHighlighted" :disabled="state.vehicle.nodeVisMode === 3" @valueChanged="applyState" />
        </BngRow>

        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.width") }}</template>
          <BngSlider v-model="state.vehicle.nodeVisWidthScale" :min="0.3" :max="5" :step="0.1" with-input @valueChanged="applyState" />
        </BngRow>

        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.transparency") }}</template>
          <BngSlider v-model="state.vehicle.nodeVisAlpha" :min="0" :max="1" :step="0.01" with-input @valueChanged="applyState" />
        </BngRow>
      </template>

      <!-- Torsion Bar Visualization Mode select -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.torsionBarVis") }}</template>
        <BngDropdown
          v-model="state.vehicle.torsionBarVisMode"
          :items="torsionBarVisModeItems"
          @valueChanged="
            value => {
              console.log('change triggered', value)
              applyState()
            }
          " />
      </BngRow>

      <!-- Torsion Bar Visualization Controls -->
      <template v-if="currentTorsionBarVisMode?.usesRange">
        <!-- Range Min -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMin") }}</template>
            <BngSlider
              v-model="currentTorsionBarVisMode.rangeMin"
              :min="currentTorsionBarVisMode.rangeMinCap"
              :max="currentTorsionBarVisMode.rangeMaxCap"
              :step="(currentTorsionBarVisMode.rangeMaxCap - currentTorsionBarVisMode.rangeMinCap) / 100"
              :input-step="(currentTorsionBarVisMode.rangeMaxCap - currentTorsionBarVisMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentTorsionBarVisMode.rangeMinEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Range Max -->
        <div class="control-row-switch indented">
          <BngRow class="control-slider-row">
            <template #label>{{ $tt("ui.debug.vehicle.visRangeMax") }}</template>
            <BngSlider
              v-model="currentTorsionBarVisMode.rangeMax"
              :min="currentTorsionBarVisMode.rangeMinCap"
              :max="currentTorsionBarVisMode.rangeMaxCap"
              :step="(currentTorsionBarVisMode.rangeMaxCap - currentTorsionBarVisMode.rangeMinCap) / 100"
              :input-step="(currentTorsionBarVisMode.rangeMaxCap - currentTorsionBarVisMode.rangeMinCap) / 1000"
              with-input
              @valueChanged="applyState" />
          </BngRow>
          <BngRow>
            <BngSwitch v-model="currentTorsionBarVisMode.rangeMaxEnabled" @valueChanged="applyState" />
          </BngRow>
        </div>

        <!-- Inclusive Range -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.useInclusiveRange") }}</template>
          <BngSwitch v-model="currentTorsionBarVisMode.usesInclusiveRange" @valueChanged="applyState" />
        </BngRow>

        <!-- Show Infinity -->
        <BngRow class="control-switch-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.showInf") }}</template>
          <BngSwitch v-model="currentTorsionBarVisMode.showInfinity" @valueChanged="applyState" />
        </BngRow>
      </template>

      <!-- Torsion Bar Vis Width and Transparency -->
      <template v-if="state.vehicle.torsionBarVisMode !== 1">
        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.width") }}</template>
          <BngSlider v-model="state.vehicle.torsionBarVisWidthScale" :min="0.1" :max="5" :step="0.1" with-input @valueChanged="applyState" />
        </BngRow>

        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.transparency") }}</template>
          <BngSlider v-model="state.vehicle.torsionBarVisAlpha" :min="0" :max="1" :step="0.01" with-input @valueChanged="applyState" />
        </BngRow>
      </template>

      <!-- Rails Slidenodes Visualization Mode select -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.railsSlideNodesVis") }}</template>
        <BngDropdown v-model="state.vehicle.railsSlideNodesVisMode" :items="railsSlideNodesModeItems" @valueChanged="applyState" />
      </BngRow>

      <template v-if="state.vehicle.railsSlideNodesVisMode !== 1">
        <!-- Rails Slidenodes Vis Width slider -->
        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.width") }}</template>
          <BngSlider v-model="state.vehicle.railsSlideNodesVisWidthScale" :min="0.1" :max="5" :step="0.1" with-input @valueChanged="applyState" />
        </BngRow>

        <!-- Rails Slidenodes Vis Transparency slider -->
        <BngRow class="control-slider-row indented">
          <template #label>{{ $tt("ui.debug.vehicle.transparency") }}</template>
          <BngSlider v-model="state.vehicle.railsSlideNodesVisAlpha" :min="0" :max="1" :step="0.01" with-input @valueChanged="applyState" />
        </BngRow>
      </template>

      <!-- Center of Gravity select -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.centerOfGravity") }}</template>
        <BngDropdown v-model="state.vehicle.cogMode" :items="cogModeItems" @valueChanged="applyState" />
      </BngRow>

      <!-- Collision Triangles mode -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.collisionTriangle") }}</template>
        <BngDropdown v-model="state.vehicle.collisionTriangleVisMode" :items="collisionTriangleModeItems" @valueChanged="applyState" />
      </BngRow>

      <!-- Collision Triangles Transparency slider -->
      <BngRow class="control-slider-row indented" v-if="state.vehicle.collisionTriangleVisMode !== 1">
        <template #label>{{ $tt("ui.debug.vehicle.transparency") }}</template>
        <BngSlider v-model="state.vehicle.collisionTriangleVisAlpha" :min="0" :max="1" :step="0.01" with-input @valueChanged="applyState" />
      </BngRow>

      <!-- Aerodynamics Mode select -->
      <BngRow class="control-dropdown-row">
        <template #label>{{ $tt("ui.debug.vehicle.aerodynamics") }}</template>
        <BngDropdown v-model="state.vehicle.aeroMode" :items="aeroModeItems" @valueChanged="applyState" />
      </BngRow>

      <!-- Aero scale slider -->
      <BngRow class="control-slider-row indented" v-if="state.vehicle.aeroMode !== 1">
        <template #label>{{ $tt("ui.debug.vehicle.aerodynamicsScale") }}</template>
        <BngSlider v-model="state.vehicle.aerodynamicsScale" :min="0" :max="0.2" :step="0.01" with-input @valueChanged="applyState" />
      </BngRow>

      <!-- Tire Contact Point checkbox -->
      <BngRow class="control-switch-row">
        <template #label>{{ $tt("ui.debug.vehicle.tireContactPoint") }}</template>
        <BngSwitch v-model="state.vehicle.tireContactPoint" @valueChanged="applyState" />
      </BngRow>

      <!-- Steering geometry checkbox -->
      <BngRow class="control-switch-row">
        <template #label>{{ $tt("ui.debug.vehicle.steeringGeometry") }}</template>
        <BngSwitch v-model="state.vehicle.steeringGeometry" @valueChanged="applyState" />
      </BngRow>

      <!-- Steering geometry line length -->
      <BngRow class="control-slider-row indented" v-if="state.vehicle.steeringGeometry">
        <template #label>{{ $tt("ui.debug.vehicle.steeringGeometryLineLength") }}</template>
        <BngSlider v-model="state.vehicle.steeringGeometryLineLength" :min="0" :max="50" :step="0.1" with-input @valueChanged="applyState" />
      </BngRow>

      <!-- Wheel thermals checkbox -->
      <BngRow class="control-switch-row" v-if="!shipping">
        <template #label>{{ $tt("ui.debug.vehicle.wheelThermals") }} 🐞</template>
        <BngSwitch v-model="state.vehicle.wheelThermals" @valueChanged="applyState" />
      </BngRow>
    </template>

    <!-- Mesh Visibility Controls -->
    <BngRow class="control-switch-row mesh-visibility">
      <template #label>{{ $tt("ui.debug.vehicle.meshVisibility") }}</template>
      <BngSmartSelect
        v-model="meshVisibility"
        :items="meshVisibilityItems"
        :disabled="disableVehicleButtons"
        @change="value => lua.core_vehicles.setMeshVisibility(value)" />
    </BngRow>

    <hr />

    <h4>{{ $tt("ui.debug.terrain") }}</h4>

    <div class="buttons terrain-buttons">
      <BngButton v-for="btn in controls.terrain.buttonGroup_1" :key="btn.label" @click="btn.action()" :accent="ACCENTS.secondary">{{
        $tt(btn.label)
      }}</BngButton>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue"
import {
  BngButton,
  BngSwitch,
  BngDropdown,
  BngDropdownContainer,
  BngInput,
  BngSlider,
  BngRow,
  BngList,
  BngSmartSelect,
  ACCENTS,
  LIST_LAYOUTS,
  LABEL_ALIGNMENTS,
} from "@/common/components/base"
import { vBngTooltip, vBngUiNavScroll } from "@/common/directives"
import { useBridge } from "@/bridge"
import { useEvents } from "@/services/events"
import { $translate } from "@/services"
import { useUINavBlocker } from "@/services/uiNavTracker"

const navBlocker = useUINavBlocker()
navBlocker.blockOnly(["context"])

const { lua, api } = useBridge()
const events = useEvents()

const state = reactive({})
const stateNoReset = reactive({
  vehicle: {
    parts: [],
    partNameToIdx: {},
    partsSelected: {},
    partsSelectedIdxs: [],
  },
})
const partsState = reactive({
  partsSorted: [],
  partsHighlightedIdxs: [],
})

const partsFiltered = computed(() => {
  let res = partsState.partsSorted
  if (!Array.isArray(res)) {
    return []
  }

  if (partsSelectedSearchTerm.value) {
    res = res.filter(part => part.includes(partsSelectedSearchTerm.value))
  }

  return res.map(p => {
    const segments = p.split("/")
    const label = segments[segments.length - 1]
    const reversePath = segments.slice(0, -1).reverse().join("\\")

    return {
      label,
      reversePath,
      value: p,
      selected: Array.isArray(partsState.partsHighlightedIdxs) && partsState.partsHighlightedIdxs.includes(partsState.partsSorted.indexOf(p) + 1),
    }
  })
})

const shipping = computed(() => window.beamng && window.beamng.shipping)

const geState = reactive({
  physicsEnabled: true,
  debugSpawnEnabled: false,
  vehicleDebugInfoEnabled: false,
})

const partsSelectedSearchTerm = ref("")
const disableVehicleButtons = ref(false)

// JBeam visualization enabled state is locally owned after the initial read from lua,
// so switch toggles won't ping-pong against later lua state updates.
const jbeamVisEnabled = ref(false)
let jbeamVisInitialized = false

const setJbeamVisEnabled = value => {
  jbeamVisInitialized = true
  jbeamVisEnabled.value = value
  api.activeObjectLua(`bdebug.setEnabled(${value})`)
}

const clearJbeamVisSettings = () => api.activeObjectLua(`bdebug.resetModes()`)

const meshVisibility = ref(1)
const meshVisibilityItems = [
  { label: "0%", value: 0 },
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
]

const controls = {
  vehicle: {
    buttonGroup_1: [
      { label: "ui.debug.vehicle.spawnNew", action: () => lua.core_vehicles.spawnDefault() },
      { label: "ui.debug.vehicle.removeCurrent", action: () => lua.core_vehicles.removeCurrent() },
      { label: "ui.debug.vehicle.cloneCurrent", action: () => lua.core_vehicles.cloneCurrent() },
      { label: "ui.debug.vehicle.removeAll", action: () => lua.core_vehicles.removeAll() },
      { label: "ui.debug.vehicle.removeOthers", action: () => lua.core_vehicles.removeAllExceptCurrent() },
      { label: "ui.debug.vehicle.resetAll", action: () => lua.resetGameplay(-1) },
      { label: "ui.debug.vehicle.reloadAll", action: () => lua.core_vehicle_manager.reloadAllVehicles() },
    ],
    toggleGroup_1: [
      { label: "ui.debug.activatePhysics", key: "physicsEnabled", onChange: () => lua.simTimeAuthority.togglePause() },
      { label: "ui.debug.debugSpawnEnabled", key: "debugSpawnEnabled", onChange: () => lua.core_vehicle_manager.toggleDebug() },
      { label: "ui.debug.vehicleDebugInfo", key: "vehicleDebugInfoEnabled", onChange: () => lua.debug_vehicleDebug.toggleDebugEnabled() },
    ],
  },
  jbeamvis: {
    controls_1: [
      { label: "ui.debug.vehicle.toggleVis", component: "switch", model: jbeamVisEnabled, onChange: setJbeamVisEnabled },
      { label: "ui.debug.vehicle.clearSettings", component: "button", accent: ACCENTS.attention, action: clearJbeamVisSettings },
    ],
  },
  terrain: {
    buttonGroup_1: [
      { label: "ui.debug.terrain.groundmodel", action: () => api.engineLua(`extensions.load("util_groundModelDebug") util_groundModelDebug.openWindow()`) },
    ],
  },
}

onMounted(async () => {
  geState.physicsEnabled = !(await lua.simTimeAuthority.getPause())
  geState.debugSpawnEnabled = await lua.core_vehicle_manager.getDebug()
  geState.vehicleDebugInfoEnabled = await lua.debug_vehicleDebug.getDebugEnabled()
  api.activeObjectLua("bdebug.isEnabled()", enabled => {
    // don't clobber a value the user may have already toggled before the callback returned
    if (jbeamVisInitialized) return
    jbeamVisInitialized = true
    jbeamVisEnabled.value = !!enabled
  })
  api.activeObjectLua("bdebug.requestState()")
  lua.core_gamestate.requestGameState()
  lua.extensions.core_vehicle_partmgmt.sendPartsSelectorStateToUI()
})

const applyState = (notSendBack = false) => {
  notSendBack = !!notSendBack
  api.activeObjectLua(`bdebug.setState(${api.serializeToLua(state)}, ${api.serializeToLua(stateNoReset)}, ${notSendBack})`)
}

const partsSelectedChanged = (part, value) => {
  if (!Array.isArray(partsState.partsHighlightedIdxs)) {
    partsState.partsHighlightedIdxs = []
  }

  const idx = partsState.partsSorted.indexOf(part) + 1
  const idxInArray = partsState.partsHighlightedIdxs.indexOf(idx)
  if (value && idxInArray === -1) {
    partsState.partsHighlightedIdxs.push(idx)
  } else if (!value && idxInArray !== -1) {
    partsState.partsHighlightedIdxs.splice(idxInArray, 1)
  }
  applyState(true)
  lua.extensions.core_vehicle_partmgmt.partsSelectorChanged(partsState)
}

const partsSelectedChecked = () => partsState.partsHighlightedIdxs.length === partsState.partsSorted.length

const partsSelectedIndeterminate = () => {
  return partsState.partsHighlightedIdxs.length !== 0 && partsState.partsHighlightedIdxs.length !== partsState.partsSorted.length
}

const partsSelectedClicked = () => {
  const shouldCheck = partsState.partsHighlightedIdxs.length !== partsState.partsSorted.length

  if (shouldCheck) {
    // Check all
    partsState.partsHighlightedIdxs = Array.from({ length: partsState.partsSorted.length }, (_, i) => i + 1)
  } else {
    // Uncheck all
    partsState.partsHighlightedIdxs = []
  }

  applyState()
  lua.extensions.core_vehicle_partmgmt.partsSelectorChanged(partsState)
}

const selectAllParts = computed({
  get: () => partsSelectedChecked(),
  set: () => partsSelectedClicked(),
})

const beamTextModeItems = computed(() => {
  if (!state.vehicle?.beamTextModes) return []
  return state.vehicle.beamTextModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.beamTextMode.${mode.name}`) : "",
  }))
})

const beamVisModeItems = computed(() => {
  if (!state.vehicle?.beamVisModes) return []
  return state.vehicle.beamVisModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.beamVisMode.${mode.name}`) : "",
  }))
})

const currentBeamVisMode = computed(() => {
  if (!state.vehicle?.beamVisModes) return null
  return state.vehicle.beamVisModes[state.vehicle.beamVisMode - 1]
})

const nodeTextModeItems = computed(() => {
  if (!state.vehicle?.nodeTextModes) return []
  return state.vehicle.nodeTextModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.nodeTextMode.${mode.name}`) : "",
  }))
})

const currentNodeTextMode = computed(() => {
  if (!state.vehicle?.nodeTextModes) return null
  return state.vehicle.nodeTextModes[state.vehicle.nodeTextMode - 1]
})

const nodeDebugTextModeItems = computed(() => {
  if (!state.vehicle?.nodeDebugTextModes) return []
  return state.vehicle.nodeDebugTextModes.map((mode, index) => ({
    value: index + 1,
    // "off" is a built-in mode with a translation; dynamic type names are shown as-is
    label: mode.name === "off" ? $translate.instant("vehicle.bdebug.nodeTextMode.off") : mode.name ?? "",
  }))
})

const nodeVisModeItems = computed(() => {
  if (!state.vehicle?.nodeVisModes) return []
  return state.vehicle.nodeVisModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.nodeVisMode.${mode.name}`) : "",
  }))
})

const currentNodeVisMode = computed(() => {
  if (!state.vehicle?.nodeVisModes) return null
  return state.vehicle.nodeVisModes[state.vehicle.nodeVisMode - 1]
})

const torsionBarVisModeItems = computed(() => {
  if (!state.vehicle?.torsionBarVisModes) return []
  return state.vehicle.torsionBarVisModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.torsionBarVisMode.${mode.name}`) : "",
  }))
})

const currentTorsionBarVisMode = computed(() => {
  if (!state.vehicle?.torsionBarVisModes) return null
  return state.vehicle.torsionBarVisModes[state.vehicle.torsionBarVisMode - 1]
})

const railsSlideNodesModeItems = computed(() => {
  if (!state.vehicle?.railsSlideNodesVisModes) return []
  return state.vehicle.railsSlideNodesVisModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.railsSlideNodesVisMode.${mode.name}`) : "",
  }))
})

const cogModeItems = computed(() => {
  if (!state.vehicle?.cogModes) return []
  return state.vehicle.cogModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.cogMode.${mode.name}`) : "",
  }))
})

const collisionTriangleModeItems = computed(() => {
  if (!state.vehicle?.collisionTriangleVisModes) return []
  return state.vehicle.collisionTriangleVisModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.collisionTriangleVisMode.${mode.name}`) : "",
  }))
})

const aeroModeItems = computed(() => {
  if (!state.vehicle?.aeroModes) return []
  return state.vehicle.aeroModes.map((mode, index) => ({
    value: index + 1,
    label: mode.name ? $translate.instant(`vehicle.bdebug.aeroMode.${mode.name}`) : "",
  }))
})

events.on("BdebugUpdate", (debugState, newStateNoReset) => {
  Object.assign(state, debugState)
  Object.assign(stateNoReset, newStateNoReset)
})

events.on("PartsSelectorUpdate", state => {
  Object.assign(partsState, state)
})

events.on("VehicleFocusChanged", () => {
  api.activeObjectLua("bdebug.requestState()")
  lua.extensions.core_vehicle_partmgmt.sendPartsSelectorStateToUI()
})

events.on("physicsStateChanged", state => (geState.physicsEnabled = !!state))
events.on("vehicleDebugInfoEnabledChanged", state => (geState.vehicleDebugInfoEnabled = !!state))
events.on("GameStateUpdate", gamestate => (disableVehicleButtons.value = gamestate.state.toLowerCase().indexOf("scenario") > -1))
</script>

<style lang="scss" scoped>
.veh-debug {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.25rem;
  overflow: hidden auto;
}

.buttons {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  > * {
    flex: 1 1 45%;
    --bng-button-max-width: none;
  }

  > .bng-button {
    &:last-child:nth-child(odd) {
      flex-basis: 100%;
    }
  }
}

.terrain-buttons {
  > * {
    flex: 1 1 100%;
    --bng-button-max-width: none;
  }
}

.jbeamvis-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  > * {
    width: 100%;
    --bng-button-max-width: none;
  }
}

$child-indent: 1.5rem;

.control-group {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 15px;

  .bng-slider {
    flex: 1;
  }

  .bng-input {
    width: 80px;
  }
}

.control-slider-row,
.control-dropdown-row,
.control-switch-row {
  width: 100%;
}

.control-row-switch {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 15px;

  .control-slider-row {
    flex: 1;
  }
}

// Inset the whole child row (background, label and control) so conditionally
// revealed controls read as children of the dropdown that toggles them.
.indented {
  margin-left: $child-indent;
  width: calc(100% - #{$child-indent});
}

.mesh-visibility {
  margin-top: 16px;
}

.parts-selector {
  display: flex;
  flex-direction: column;
  margin: 8px 0;

  .bng-select-fullwidth {
    width: 100%;
  }
}

:deep() {
  .parts-switch {
    margin: 0.25em 0;
  }

  .parts-switch-label {
    display: inline-block;
    width: 100%;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.switch-indeterminate {
  :deep(.bng-switch-indicator) {
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 2px;
      background-color: currentColor;
    }
  }
}
</style>
