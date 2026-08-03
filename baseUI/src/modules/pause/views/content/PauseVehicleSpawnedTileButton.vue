<template>
  <div
    class="vehicle-card"
    :class="{
      current: vehicle.isCurrent || (vehicle.multiSeatLocal && vehicle.controllingPlayerNums?.length > 0),
      ai: aiActive,
    }"
    role="button"
    tabindex="0"
    bng-nav-item
    :data-spawned-vehicle-id="vehicle.vehicleId"
    :bng-scoped-nav-autofocus="autofocus ? 'true' : null"
    v-bng-sound-class="'bng_main_secondary'"
    @click="onClick"
  >
    <Background class="vehicle-card-background" />

    <div class="vehicle-card-main">
      <div class="content-main">
        <div class="info-row">
          <div class="vehicle-icon-wrap">
            <BngIcon
              v-if="vehicle.icon"
              class="vehicle-icon"
              :type="vehicle.icon"
            />
            <span class="vehicle-number">{{ iconNumberLabel }}</span>
          </div>
          <div class="vehicle-info">
            <div class="vehicle-label">{{ vehicle.cardDisplayName }}</div>
          </div>
        </div>
        <div class="status-actions-row">
          <div class="vehicle-quick-action-slots">
            <template v-for="slot in resolvedActionSlots" :key="slot.key">
              <button
                v-show="slot.action"
                class="vehicle-action-slot"
                :class="{
                  'is-empty': !slot.action,
                  danger: slot.key === 'delete',
                  adjust: slot.key === 'openMore',
                }"
                :disabled="!slot.action || slot.action.disabled"
                :title="slot.action?.label || slot.label"
                bng-no-nav="true"
                tabindex="-1"
                @click.stop="emit('slot-action', vehicle, slot.key)"
                v-bng-soundClass="slot.uiEvent == 'ok' ? 'bng_main_secondary_onlyClick' : 'bng_click_generic'"
              >
                <BngBinding
                  v-if="focused && slot.action"
                  :ui-event="slot.uiEvent"
                  controller
                  class="vehicle-action-binding"
                />
                <BngIcon
                  v-if="slot.action"
                  class="vehicle-action-icon"
                  :type="slot.icon || slot.action?.icon"
                />
              </button>
              <div v-if="slot.key !== 'delete'" class="vehicle-action-slot-separator" />
            </template>
          </div>
        </div>
      </div>
      <div class="main-action">
        <div class="vehicle-owner" v-if="controllerUiElements.length > 0">
          <div
            v-for="(element, index) in controllerUiElements"
            :key="`${element.iconId || 'icon'}-${element.number ?? 'none'}-${index}`"
            class="vehicle-controller-element"
          >
            <BngIcon
              class="vehicle-controller-icon"
              :type="element.iconId"
              :style="element.color ? { '--bng-icon-color': element.color } : null"
            />
            <span v-if="element.number != null" class="vehicle-controller-badge">{{ element.number }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngBinding, BngIcon } from "@/common/components/base"
import { Background } from "@/common/components/utility"
import { vBngSoundClass } from "@/common/directives"

defineOptions({ name: "PauseVehicleSpawnedTileButton" })

const props = defineProps({
  vehicle: {
    type: Object,
    required: true,
  },
  autofocus: {
    type: Boolean,
    default: false,
  },
  actionSlots: {
    type: Array,
    default: () => [],
  },
  aiActive: {
    type: Boolean,
    default: false,
  },
  focused: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["select", "slot-action"])

const iconNumberLabel = computed(() => {
  if (props.vehicle?.displayNumber != null) return String(props.vehicle.displayNumber)
  return String(props.vehicle?.cardDisplayNumber || "").replace(/\.$/, "")
})
const controllerUiElements = computed(() => {
  const elements = props.vehicle?.controllerUiElements
  if (!Array.isArray(elements)) return []
  return elements.filter(element => typeof element?.iconId === "string" && element.iconId.length > 0)
})

const resolvedActionSlots = computed(() => props.actionSlots.map(slot => ({
  ...slot,
  action: props.vehicle?.slotActions?.[slot.key] || null,
})))

function onClick() {
  emit("select", props.vehicle)
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;
.vehicle-card {
  @include modify-focus(var(--bng-corners-1), 0.0rem);
  --vehicle-card-action-height: 2.25rem;
  --vehicle-card-gap: 0.45rem;
  --vehicle-card-radius: var(--bng-corners-1);

  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.8;
  --bng-bg-hover: var(--bng-cool-gray-800);
  --bng-bg-hover-opacity: 0.78;
  --bng-bg-active: var(--bng-cool-gray-800);
  --bng-bg-active-opacity: 0.95;
  --bng-bg-focus-opacity: 0.6;
  --bng-bg-size: 120% 120%;
  --bng-bg-position: center;
  --bng-button-text-enabled-color: var(--bng-off-white);
  --bng-button-text-hover-color: var(--bng-off-white);
  --bng-button-text-active-color: var(--bng-off-white);

  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 0.0625em;

  --bng-bg-border-enabled: var(--bng-cool-gray-500);
  --bng-bg-border-hover: var(--bng-cool-gray-500);
  --bng-bg-border-active: var(--bng-cool-gray-500);
  --bng-bg-border-disabled: var(--bng-cool-gray-500);
  --bng-bg-border-focus: var(--bng-cool-gray-300);

  .vehicle-card-background {
    background-repeat: no-repeat;
  }


  position: relative;
  isolation: isolate;
  display: flex;
  box-sizing: border-box;
  height: 6em;
  padding: 0.25em;
  padding-right: 0;
  border-radius: var(--vehicle-card-radius);
  color: var(--bng-off-white);
  cursor: pointer;
  overflow: visible;

  &:focus,
  &.focus-visible {
    outline: none;
  }

  &.current {
    --bng-bg-image: linear-gradient(-120deg, rgba(var(--bng-orange-500-rgb), 0.44), rgba(var(--bng-cool-gray-900-rgb), 0.98));
  }

  &.ai:not(.current) {
    --bng-bg-image: linear-gradient(-120deg, rgba(var(--bng-ter-blue-gray-500-rgb), 0.44), rgba(var(--bng-cool-gray-900-rgb), 0.98));
  }
}

.vehicle-card-main {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.content-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--vehicle-card-gap);
  min-width: 0;
  height: 100%;
}

.info-row,
.status-actions-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25em;
  min-width: 0;
}

.info-row {
  flex: 1 1 auto;
  padding: 0 0.25rem;
}

.status-actions-row {
  justify-content: space-between;
}

.spacer {
  flex: 1 1 auto;
  min-width: 0;
}

.main-action {
  display: inline-flex;
  flex: 0 0 auto;
  min-width: 1.5em;
  align-self: flex-start;
  border-left: 1px solid rgba(var(--bng-cool-gray-200-rgb), 0.25);
  height: 100%;
  padding-left: 0.15rem;
  min-width: 2.25em;


}

.arrow-forward {
  --bng-icon-size: 1.5em;
}

.vehicle-icon-wrap {
  position: relative;
  display: flex;
  align-self: center;
  align-items: center;
  flex: 0 0 auto;
  width: 2.5em;
  height: 2.0em;



  .vehicle-icon {
    --bng-icon-size: 2.0em;
    --bng-icon-color: var(--bng-off-white);
  }
  .vehicle-number {
    position: absolute;
    right: 0;
    bottom: 50%;
    transform: translateY(50%);

    font-size: 0.7em;

    font-family: "Noto Sans Mono", var(--fnt-mono);
    font-weight: bold;
    min-width: 3ch;
    padding: 0.25em 0.25em;
    border-radius: var(--bng-corners-3);
    background: var(--bng-off-white);
    color: var(--bng-off-black);
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }
}



.vehicle-info {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.vehicle-label {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  line-height: 1.25;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
  max-height: calc(1.25em * 2);
  transform: translateY(0.0625em);
}

.vehicle-owner {

  display: flex;
  flex-direction: column;
  padding: 0.15rem;
  gap: 0.25rem;

  border-radius: var(--bng-corners-1);
  background: var(--vehicle-owner-bg);
  overflow: hidden;

  &--babyblue {
    --vehicle-owner-bg: var(--bng-add-babyblue-800);
    --vehicle-owner-border: var(--bng-add-babyblue-700);
  }

  &--green {
    --vehicle-owner-bg: var(--bng-add-green-800);
    --vehicle-owner-border: var(--bng-add-green-700);
  }

  &--red {
    --vehicle-owner-bg: var(--bng-add-red-800);
    --vehicle-owner-border: var(--bng-add-red-700);
  }

  &--gray,
  &--player {
    --vehicle-owner-bg: var(--bng-cool-gray-800);
    --vehicle-owner-border: var(--bng-cool-gray-700);
  }
}

.vehicle-controller-icon {
  --bng-icon-size: 1.5em;
}

.vehicle-controller-element {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vehicle-controller-badge {
  position: absolute;
  right: -0.00rem;
  bottom: -0.0rem;
  min-width: 1.1em;
  padding: 0 0.0em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bng-off-white);
  color: rgba(var(--bng-off-black-rgb), 0.90);
  font-family: var(--fnt-mono);
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  padding-top: 0.19em;
}

.vehicle-quick-action-slots {
  display: flex;
  align-items: stretch;
  gap: 0.125em;
  flex: 1 1 auto;
  padding-right: 0.25rem;
  visibility: hidden;

  .vehicle-card:hover &,
  .vehicle-card:focus &,
  .vehicle-card.focus-visible &,
  .vehicle-card:focus-within & {
    visibility: visible;
  }
}

.vehicle-action-slot-separator {
  width: 1px;
  background: rgba(var(--bng-cool-gray-200-rgb), 0.25);
  margin: 0.525em 0;
  content: "";
}

.vehicle-action-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  gap: 0.15rem;
  width: 100%;
  min-width: 3em;
  height: var(--vehicle-card-action-height);
  padding: 0 0.25em;
  border: 0;
  border-radius: var(--bng-corners-1);
  background: none;
  color: var(--bng-off-white);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.12s ease;

  .vehicle-card:hover &,
  .vehicle-card:focus &,
  .vehicle-card.focus-visible &,
  .vehicle-card:focus-within & {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .vehicle-card:hover &:disabled,
  .vehicle-card:focus &:disabled,
  .vehicle-card.focus-visible &:disabled,
  .vehicle-card:focus-within &:disabled {
    cursor: default;
    opacity: 0.42;
    pointer-events: none;
  }

  &.danger {
    --background: rgba(var(--bng-add-red-700-rgb), 0.52);
  }

  &.adjust {
    --background: rgba(var(--bng-add-blue-800-rgb), 0.52);
  }

  &:hover:not(:disabled) {
    background: rgba(var(--bng-cool-gray-700-rgb), 0.5);
  }

  &.danger:hover:not(:disabled) {
    background: rgba(var(--bng-add-red-700-rgb), 0.5);
  }

  &.adjust:hover:not(:disabled) {
    background: rgba(var(--bng-cool-gray-700-rgb), 0.5);
  }

  &:disabled {
    cursor: default;
  }

  &.is-empty {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
}

.vehicle-action-binding {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:empty {
    display: none;
  }
}



</style>
