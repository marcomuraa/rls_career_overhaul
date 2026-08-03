<template>
  <div class="oneshot-race-overview">
    <div class="overview-row selection-row">
      <div class="config-section selectable-component" bng-nav-item v-bng-blur @click="emit('go-to-level')">
        <BlurBackground />
        <div class="section-header">
          <BngCardHeading type="ribbon" class="section-title">
            <span class="section-title-label">{{ $tt(mode.selectLevelLabelKey) }}</span>
            <span class="section-title-value">{{ level?.name || "" }}</span>
          </BngCardHeading>
        </div>
        <div class="section-content">
          <GameplayDetails
            v-if="level"
            :active-item="{ levelName: level.levelName }"
            :active-item-details="levelDetails"
            hide-bottom-section
            inline
            :show-header-title="false"
          />
          <div v-else class="placeholder-content">
            <BngIcon :type="icons.road" class="placeholder-icon" />
            <p class="placeholder-text">{{ $tt(mode.selectLevelLabelKey) }}</p>
          </div>
        </div>
      </div>

      <div
        class="config-section selectable-component"
        :class="{ disabled: !level }"
        bng-nav-item
        v-bng-blur
        v-bng-disabled="!level"
        @click="level && emit('go-to-middle')"
      >
        <BlurBackground />
        <div class="section-header">
          <BngCardHeading type="ribbon" class="section-title">
            <span class="section-title-label">{{ $tt(mode.selectMiddleLabelKey) }}</span>
            <span class="section-title-value">{{ middle?.name || "" }}</span>
          </BngCardHeading>
        </div>
        <div class="section-content">
          <GameplayDetails
            v-if="middle"
            :active-item="{ levelName: middle.levelName, middleName: middle.middleName }"
            :active-item-details="middleDetails"
            hide-bottom-section
            inline
            :show-header-title="false"
          />
          <div v-else class="placeholder-content">
            <BngIcon type="flag" class="placeholder-icon" />
            <p class="placeholder-text">{{ $tt(mode.selectMiddleLabelKey) }}</p>
          </div>
        </div>
      </div>

      <div class="config-section selectable-component" bng-nav-item v-bng-blur @click="emit('go-to-vehicle')">
        <BlurBackground />
        <div class="section-header">
          <BngCardHeading type="ribbon" class="section-title">
            <span class="section-title-label">{{ $tt(mode.selectVehicleLabelKey) }}</span>
            <span class="section-title-value">{{ vehicle?.name || "" }}</span>
          </BngCardHeading>
        </div>
        <div class="section-content">
          <VehicleDetails
            v-if="vehicle"
            :active-item="{ model_key: vehicle.model, config_key: vehicle.config }"
            :active-item-details="vehicleDetails"
            hide-details-and-buttons
            inline
            :show-header-title="false"
          />
          <div v-else class="placeholder-content">
            <BngIcon type="car" class="placeholder-icon" />
            <p class="placeholder-text">{{ $tt(mode.selectVehicleLabelKey) }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="overview-row settings-row">
      <OneshotRaceOptionsSummaryPanel
        class="options-panel"
        :mode="mode"
        :middle="middle"
        :settings="settings"
        @update-setting="onUpdateSetting"
      />
      <OneshotRaceHighscoresPanel
        v-if="mode.showHighscores"
        class="highscores-panel"
        :highscores="highscores"
        :show-lap-records="showLapRecords"
        :show-lap-records-toggle="!!middle && (settings.lapCount || 0) > 1"
        @toggle-lap-records="emit('toggle-lap-records')"
      />
    </div>

    <div class="overview-row play-row">
      <BngButton class="play-button" accent="main" icon="play" :disabled="isDisabled" bng-scoped-nav-autofocus @click="emit('play')">
        {{ $tt(mode.playLabelKey) }}
      </BngButton>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngButton, BngCardHeading, BngIcon, icons } from "@/common/components/base"
import { vBngBlur, vBngDisabled } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import GameplayDetails from "@/modules/gameplaySelector/components/GameplayDetails.vue"
import VehicleDetails from "@/modules/vehicleselect/components/VehicleDetails.vue"
import OneshotRaceOptionsSummaryPanel from "./OneshotRaceOptionsSummaryPanel.vue"
import OneshotRaceHighscoresPanel from "./OneshotRaceHighscoresPanel.vue"

const props = defineProps({
  mode: {
    type: Object,
    required: true,
  },
  level: {
    type: Object,
    default: null,
  },
  middle: {
    type: Object,
    default: null,
  },
  vehicle: {
    type: Object,
    default: null,
  },
  settings: {
    type: Object,
    default: () => ({}),
  },
  highscores: {
    type: Array,
    default: () => [],
  },
  showLapRecords: {
    type: Boolean,
    default: false,
  },
  isDisabled: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(["go-to-level", "go-to-middle", "go-to-vehicle", "update-setting", "toggle-lap-records", "play"])

const levelDetails = computed(() => props.level && { headerTitle: props.level.name, preview: props.level.preview })
const middleDetails = computed(() => props.middle && { headerTitle: props.middle.name, preview: props.middle.preview })
const vehicleDetails = computed(() => props.vehicle && { headerTitle: props.vehicle.name, preview: props.vehicle.preview })

function onUpdateSetting(key, value) {
  emit("update-setting", key, value)
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.oneshot-race-overview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  height: 100%;
}

.overview-row {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.selection-row {
  flex: 1 1 auto;
  min-height: 0;
}

.settings-row {
  flex: 1 1 auto;
  min-height: 0;
}

.play-row {
  flex: 0 0 auto;
  justify-content: center;
}

.play-button {
  min-width: 16rem;
  font-size: 1.25rem;
}

.config-section {
  position: relative;
  background-color: var(--bng-black-o4);
  border-radius: var(--bng-corners-2);
  overflow: visible;
  display: flex;
  flex-direction: column;
  height: 100%;
  color: white;
  flex: 1 1 33%;
  min-width: 0;
  --font-size: 1rem;
  @include modify-focus(0.5rem, 0.25rem);

  &.selectable-component:hover {
    box-shadow: inset 0 0 5rem rgba(var(--bng-orange-400-rgb), 0.33);
  }

  &.selectable-component {
    cursor: pointer;
  }

  &.disabled {
    opacity: 0.66;
    pointer-events: none;
  }
}

.options-panel,
.highscores-panel {
  flex: 1 1 50%;
  min-width: 0;
}

.section-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: var(--bng-black-o2);
  border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;

  .section-title {
    color: white;
    margin-bottom: 0;
    padding-bottom: 0.5rem;
    margin-top: 0.5rem;
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    width: 100%;
    overflow: visible;

    .section-title-label {
      margin-right: 0.5rem;
    }

    .section-title-value {
      font-weight: 600;
    }
  }
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  gap: 1rem;
  flex: 1;
}

.placeholder-icon {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.4);
}

.placeholder-text {
  font-size: 1rem;
  font-style: italic;
  margin: 0;
}
</style>
