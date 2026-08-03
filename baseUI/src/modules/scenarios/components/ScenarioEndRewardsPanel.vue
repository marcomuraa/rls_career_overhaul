<template>
  <div
    v-if="rewards"
    class="scenario-end-rewards"
    v-bng-scoped-nav="{ scopeId: 'scenario-end-rewards', type: 'container' }"
  >
    <div
      v-if="hasChoices"
      class="panel choices-panel"
    >
      <div class="choices-title">Choose a vehicle</div>
      <div class="choices-list">
        <div
          v-for="(vehicle, index) in rewards.choices.vehicles"
          :key="vehicle.id || index"
          class="choice-item"
          :class="{ selected: chosenVehicle === vehicle }"
          tabindex="0"
          bng-scoped-nav-focusable
          @click="$emit('choose-vehicle', vehicle)"
          @keydown.enter.space.prevent="$emit('choose-vehicle', vehicle)"
        >
          <div class="choice-img-wrap">
            <img v-if="vehicle.preview" :src="vehicle.preview" class="choice-img" alt="vehicle" />
            <span v-if="chosenVehicle === vehicle" class="choice-check">✓</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel other-panel">
      <div class="other-title">Other</div>
      <div class="other-list">
        <span
          v-for="(item, index) in rewardVehicles"
          :key="'rv-' + index"
        >
          {{ item.Name }}<span v-if="index < rewardVehicles.length - 1">,</span>
        </span>
      </div>
      <div class="other-list other-list-wrap">
        <span
          v-for="(item, index) in otherItems"
          :key="'ot-' + index"
        >
          {{ item }}<span v-if="index < otherItems.length - 1">,</span>
        </span>
      </div>
      <div v-if="rewards.money !== undefined" class="money">
        {{ rewards.money }} $
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { vBngScopedNav } from "@/common/directives"

const props = defineProps({
  rewards: { type: Object, default: () => null },
  chosenVehicle: { type: Object, default: () => null },
})

defineEmits(["choose-vehicle"])

const hasChoices = computed(() => {
  const c = props.rewards?.choices?.vehicles
  return Array.isArray(c) && c.length > 0
})

const rewardVehicles = computed(() => Array.isArray(props.rewards?.vehicles) ? props.rewards.vehicles : [])
const otherItems = computed(() => Array.isArray(props.rewards?.other) ? props.rewards.other : [])
</script>

<style lang="scss" scoped>
.scenario-end-rewards {
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 1rem;
}

.panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.5rem;
  box-sizing: border-box;
}

.choices-panel {
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.choices-title,
.other-title {
  text-transform: uppercase;
  font-weight: bold;
}

.choices-list {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  gap: 0.5rem;
}

.choice-item {
  cursor: pointer;
  padding: 0.25rem;
  border: solid 2px transparent;
  box-sizing: border-box;

  &.selected {
    border-color: orange;
  }

  &:focus,
  &:hover {
    border-color: orange;
    outline: none;
  }
}

.choice-img-wrap {
  position: relative;
}

.choice-img {
  width: 100%;
  display: block;
}

.choice-check {
  position: absolute;
  bottom: 8%;
  left: 4.5%;
  color: rgba(0, 0, 0, 0.8);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.other-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.other-list {
  display: flex;
  flex-direction: column;
}

.other-list-wrap {
  flex-direction: row;
  flex-wrap: wrap;
}

.money {
  font-weight: bold;
}
</style>
