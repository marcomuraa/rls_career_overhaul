<template>
  <Button
    v-if="data"
    :class="{ 'vehicle-tile-row': true, selected, 'no-interaction': noInteraction, 'no-hover': noInteraction }"
    :disabled="data.disabled"
    :no-sound="noInteraction"
    :tab-index="noInteraction ? -1 : 0"
    :nav-item="!noInteraction"
    :inert="noInteraction ? '' : null"
  >
    <div :class="{ preview: true, locked }">
      <AspectRatio v-if="thumbUrl" :ratio="'16:9'" :external-image="thumbUrl" class="preview-image">
        <div class="indicators-overlay">
          <BngIcon v-if="data.favorite" :type="icons.star" color="#fd0" v-bng-tooltip="$translate.instant('ui.menu.gridSelector.tags.favourite')" />
          <BngIcon v-if="data.delayReason === 'repair'" :type="icons.wrench" color="#fff" />
          <BngCondition v-else :integrity="partConditionAvg" :integrity-warning="data.needsRepair" :color="colour" show-tooltip />
          <PerformanceIndexSticker
            :vehicle-class="data.certificationData && data.certificationData.vehicleClass"
            :show-index="false"
            size="sm"
            high-contrast
          />
        </div>
        <span class="lock-reason" v-if="locked">{{ locked.reason }}</span>
        <span class="lock-time" v-if="locked && locked.eta">{{ locked.eta }}</span>
      </AspectRatio>
      <span class="valueReduced" v-if="!(data.returnLoanerPermission && data.returnLoanerPermission.allow) && data.partConditionAvg < 1">{{ $translate.instant("ui.career.inventory.tile.valueReduced") }}</span>
      <InsurancePerkIcon class="not-insured-overlay" v-if="!data.isInsured" :perkIconData="{ iconOnly: data.isInsured, color: 'red', smallText: $translate.instant('ui.career.inventory.tile.notInsured') }" />
    </div>

    <div class="content" v-if="!data._message">
      <div class="header">
        <div class="title-section">
          <div class="name">{{ data.niceName }}</div>
        </div>
      </div>

      <div class="details">
        <div class="location-section">
          <span class="location-label">{{ $translate.instant("ui.career.inventory.tile.location") }}</span>
          <span class="location-value">{{ location }}</span>
        </div>

        <div class="value-section" v-if="!data.returnLoanerPermission?.allow">
          <span v-if="partConditionAvg < 1" class="value-label reduced">{{ $translate.instant("ui.career.inventory.tile.currentValue") }}</span>
          <span v-else class="value-label">{{ $translate.instant("ui.career.inventory.tile.value") }}</span>
          <BngUnit :money="data.value" />
          <div v-if="partConditionAvg < 1" class="total-value">
            {{ $translate.instant("ui.career.inventory.tile.totalValue") }} <BngUnit :money="data.valueRepaired" />
          </div>
        </div>

        <div class="insurance-section">
          <span class="insurance-label">{{ $translate.instant("ui.career.inventory.tile.insurance") }}</span>
          <span class="insurance-value">{{ data.insuranceInfo ? data.insuranceInfo.name : $translate.instant("ui.career.inventory.tile.notApplicable") }}</span>
          <div v-if="!data.isInsured" class="warn">{{ $translate.instant("ui.career.repair.notInsured") }}</div>
        </div>
      </div>
    </div>
  </Button>
</template>

<script>
export default {
  width: 100, // em
  margin: 0.25, // em, on each side
}
</script>

<script setup>
import { computed } from "vue"
import { BngCondition, BngUnit, BngIcon, icons } from "@/common/components/base"
import { AspectRatio, Button } from "@/common/components/utility"
import { vBngTooltip } from "@/common/directives"
import InsurancePerkIcon from "@/modules/career/components/insurance/insurancePerkIcon.vue"
import PerformanceIndexSticker from "@/modules/career/components/vehiclePerformance/PerformanceIndexSticker.vue"
import { useBridge } from "@/bridge"
import { $translate } from "@/services/translation"
const { units } = useBridge()

const props = defineProps({
  data: Object,
  isTutorial: Boolean,
  selected: Boolean,
  noInteraction: {
    type: Boolean,
    default: false
  },
  small: Boolean,
})

const partConditionAvg = computed(() => {
  if (!props.data) return 1
  if (props.data.partConditions) {
    const conds = Object.values(props.data.partConditions)
    return conds.reduce((i, c) => i + c.integrityValue, 0) / conds.length
  }
  return 1
})

const colour = computed(() => props.data?.config?.paints?.[0]?.baseColor ?? "#ccc")

const thumbUrl = computed(() => props.data.thumbnail ? `${props.data.thumbnail}?${props.data.dirtyDate}` : null)

const location = computed(() => {
  let res
  if (locked.value && !locked.value.location) {
    res = locked.value.reason
  } else if (props.data.inGarage) {
    res = $translate.instant("ui.career.inventory.tile.inGarage")
  } else if (props.data.distance) {
    res = $translate.instant("ui.career.inventory.tile.distanceAway", { distance: units.buildString("length", props.data.distance, 0) })
  } else {
    res = $translate.instant("ui.career.inventory.tile.storage")
  }
  return res
})

const locked = computed(() => {
  /**
   * @type {Object}
   * @prop {string} [reason] Blocking reason
   * @prop {string} [eta] Estimated time
   * @prop {boolean} [location] If location should be processed and displayed normally
   */
  let res
  if (props.data._message) {
    res = { reason: props.data._message }
  } else if (props.data.missingFile) {
    res = { reason: $translate.instant("ui.career.inventory.tile.missingFile") }
  } else if (props.data.timeToAccess) {
    const eta = `${~~(props.data.timeToAccess / 60)}:${String(~~props.data.timeToAccess % 60).padStart(2, "0")}`
    if (props.data.delayReason === "bought") {
      res = { reason: $translate.instant("ui.career.inventory.tile.outForDelivery"), eta }
    } else if (props.data.delayReason === "repair") {
      res = { reason: $translate.instant("ui.career.inventory.tile.beingRepaired"), eta }
    } else {
      res = { reason: $translate.instant("ui.career.inventory.tile.availableIn"), eta }
    }
  } else if (props.data.needsRepair) {
    res = { reason: $translate.instant("ui.condition.needsRepair"), location: true }
  }
  return res
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

.vehicle-tile-row {
  --bng-content-flow: row;
  --bng-content-align: stretch;
  --bng-content-justify: flex-start;
  --bng-button-min-width: auto;
  --bng-button-max-width: 100%;
  --bng-button-margin: 0;
  --bng-button-padding: 0.5em;
  --bng-button-padding-top: 0.5em;
  --bng-button-padding-bottom: 0.5em;
  --bng-bg-border-radius: var(--bng-corners-1);
  --bng-bg-border-width: 1px;
  --bng-bg-enabled: rgba(0, 0, 0, 0.6);
  --bng-bg-hover: rgba(var(--bng-cool-gray-700-rgb), 0.8);
  --bng-bg-active: rgba(var(--bng-cool-gray-700-rgb), 0.8);
  --bng-bg-focus: rgba(var(--bng-cool-gray-700-rgb), 0.8);
  --bng-bg-disabled: rgba(0, 0, 0, 0.6);
  --bng-bg-enabled-opacity: 1;
  --bng-bg-hover-opacity: 1;
  --bng-bg-active-opacity: 1;
  --bng-bg-focus-opacity: 1;
  --bng-bg-disabled-opacity: 1;
  --bng-bg-border-enabled: rgba(255, 255, 255, 0.1);
  --bng-bg-border-hover: rgba(255, 255, 255, 0.1);
  --bng-bg-border-active: rgba(255, 255, 255, 0.1);
  --bng-bg-border-focus: var(--bng-cool-gray-300);
  --bng-bg-border-disabled: rgba(255, 255, 255, 0.1);

  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  box-sizing: border-box;
  text-align: left;

  font-family: "Overpass", var(--fnt-defs);
  color: var(--bng-off-white);

  // Modify the focus frame radius and offset based on tile corner radius
  @include modify-focus(var(--bng-corners-1), 0.25rem);

  &.selected {
    padding-left: 1em;
    border-left: 0.5em solid #f60;
  }

  &.no-interaction {
    --bng-bg-hover: var(--bng-bg-enabled);
    --bng-bg-active: var(--bng-bg-enabled);
    --bng-bg-focus: var(--bng-bg-enabled);
    --bng-bg-border-hover: var(--bng-bg-border-enabled);
    --bng-bg-border-active: var(--bng-bg-border-enabled);
    --bng-bg-border-focus: var(--bng-bg-border-enabled);
    flex-direction: row;
  }


  &[disabled] {
    pointer-events: none;
    opacity: 0.5;
    > * {
      color: #aaa;
    }
  }
}

.preview {
  position: relative;
  flex: 0 0 18rem;
  width: auto;
  height: auto;
  display: flex;

  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: var(--bng-corners-1);
  background-color: rgba(0, 0, 0, 0.3);



  &.small {
    flex: 0 0 12rem;
  }

  .preview-image {
    width: 100%;
    height: 100%;
  }

  > .not-insured-overlay {
    position: absolute;
    top: 0.5em;
    right: 0.5em;
    padding: 0.25em 0.5em;
    border-radius: 0.25em;
    font-size: 0.8em;
    font-weight: 600;
    text-shadow: 0 0 0.2em #000;
    z-index: 10;
  }

  .indicators-overlay {
    position: absolute;
    bottom: 0.5em;
    left: 0.5em;
    display: flex;
    align-items: center;
    gap: 0.5em;
    z-index: 10;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 0.25em 0.5em;
    border-radius: var(--bng-corners-1);
  }
}

[disabled],
.locked {
  .preview-image {
    filter: brightness(50%) saturate(50%);
  }
}

   .lock-reason,
   .lock-time {
    font-size: 1.5em;
    text-align: center;
    text-shadow: 0 0 0.5em #000;
    z-index: 5;
    position: relative;
  }
   .lock-time {
    font-size: 1.5em;
    font-weight: 200;
    letter-spacing: 0.1em;
  }
   .valueReduced {
    font-size: 1em;
    font-weight: 200;
    color: red;
    z-index: 5;
    position: relative;
  }

.content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.5em 1em;
  min-width: 0; // Allow flex item to shrink below content size
  overflow: hidden; // Prevent content from overflowing
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5em;
}

.title-section {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;

  .name {
    font-size: 1.4em;
    font-weight: 700;
    margin-bottom: 0.25em;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 100%;
  }
}


.details {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  flex: 1 1 auto;
}

.location-section,
.value-section,
.insurance-section {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.9em;
}

.location-label,
.value-label,
.insurance-label {
  font-weight: 600;
  color: var(--bng-cool-gray-300);
  flex: 0 0 auto;
}

.location-value,
.insurance-value {
  flex: 1 1 auto;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.value-label.reduced {
  color: red;
}

.total-value {
  font-size: 0.8em;
  color: var(--bng-cool-gray-300);
  margin-top: 0.25em;
}

.warn {
  color: rgb(242, 75, 75);
  font-size: 0.8em;
  margin-left: 0.5em;
}


// Responsive adjustments
@media screen and (max-width: 768px) {
  .vehicle-tile-row {
    height: auto;
    min-height: 8em;
    flex-direction: column;

    .preview {
      flex: 0 0 8em;
      width: 100%;
    }

    .content {
      padding: 0.5em;
    }

    .details {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.5em;
    }

    .location-section,
    .value-section,
    .insurance-section {
      flex: 1 1 50%;
      min-width: 0;
    }
  }
}
</style>
