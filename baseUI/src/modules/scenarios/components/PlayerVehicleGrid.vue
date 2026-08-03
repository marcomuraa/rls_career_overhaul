<template>
  <div class="player-vehicle-grid">
    <div v-if="hasVehicles" class="hint">
      {{ $t("ui.scenarios.playerAssignment.chooseVehicleHint") }}
    </div>

    <div class="vehicles-row">
      <div
        v-for="(vehicleName, vehicleKey) in playersConfig.vehicles"
        :key="vehicleKey"
        v-show="vehicleName"
        class="vehicle-cell"
        :class="{ unavailable: !!playersConfig.inv?.[vehicleName] }"
      >
        <div class="vehicle-name">
          {{ $tt(vehicleName) }}
          <hr />
        </div>

        <div class="players">
          <div
            v-for="(playerVehicle, playerKey) in playersConfig.players"
            :key="playerKey"
          >
            <div v-if="String(playerVehicle) === String(vehicleKey)" class="player-tag">
              <BngIcon :type="getDeviceIcon(playerKey)" />
              <small>
                {{ $tt(playersConfig.devices?.[playerKey]?.[1] || "") }}
                ({{ $tt("options.player") }} {{ (playersConfig.assignedPlayers?.[playerKey] || 0) + 1 }})
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngIcon, icons } from "@/common/components/base"

const props = defineProps({
  playersConfig: { type: Object, required: true },
})

const hasVehicles = computed(() => !!props.playersConfig?.vehicles && Object.keys(props.playersConfig.vehicles).length > 0)

function getDeviceIcon(deviceName) {
  if (!deviceName) return icons.gamepad
  const prefix = String(deviceName).slice(0, 3).toLowerCase()
  switch (prefix) {
    case "key": return icons.keyboard || icons.gamepad
    case "mou": return icons.mouse || icons.gamepad
    default: return icons.gamepad
  }
}
</script>

<style lang="scss" scoped>
.player-vehicle-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: center;
}

.hint {
  text-align: center;
}

.vehicles-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.vehicle-cell {
  min-width: 100px;
  max-width: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.25rem;
  color: white;

  &.unavailable {
    color: salmon;
  }

  hr {
    width: 100%;
    border: none;
    border-top: 1px solid currentColor;
    margin: 0.25rem 0;
  }

  .vehicle-name {
    height: 32px;
  }
}

.players {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.player-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}
</style>
