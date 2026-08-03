<template>
  <div class="oneshot-race-highscores-panel" :class="{ disabled: !highscores.length }" v-bng-blur>
    <BlurBackground />
    <div class="section-header">
      <BngCardHeading type="ribbon" class="section-title">
        <BngIcon type="medal" />
        <span>{{ $t(showLapRecords ? "ui.quickrace.highscoresSingle" : "ui.quickrace.highscoresTotal") }}</span>
      </BngCardHeading>
      <BngSwitch
        v-if="showLapRecordsToggle"
        class="lap-records-switch"
        :label="$tt('ui.quickrace.tracks.lap')"
        label-before
        inline
        :model-value="showLapRecords"
        @update:modelValue="emit('toggle-lap-records')"
      />
    </div>
    <div class="section-content">
      <div v-if="highscores.length" class="highscores-table">
        <div class="highscores-row highscores-header">
          <span class="col-rank"></span>
          <span class="col-name">{{ $tt("ui.quickrace.name") }}</span>
          <span class="col-vehicle">{{ $tt("ui.quickrace.selectVehicle") }}</span>
          <span class="col-time">{{ $tt("ui.quickrace.time") }}</span>
        </div>
        <div class="highscores-row" v-for="(score, index) in highscores" :key="index">
          <span class="col-rank">{{ index + 1 }}</span>
          <span class="col-name">{{ score.playerName }}</span>
          <span class="col-vehicle">{{ score.vehicleBrand }} {{ score.vehicleName }}</span>
          <span class="col-time">{{ score.formattedTime }}</span>
        </div>
      </div>
      <div v-else class="placeholder-content">
        <BngIcon :type="icons.medal" class="placeholder-icon" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { BngCardHeading, BngIcon, BngSwitch, icons } from "@/common/components/base"
import { vBngBlur } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"

defineProps({
  highscores: {
    type: Array,
    default: () => [],
  },
  showLapRecords: {
    type: Boolean,
    default: false,
  },
  showLapRecordsToggle: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["toggle-lap-records"])
</script>

<style scoped lang="scss">
.oneshot-race-highscores-panel {
  position: relative;
  background-color: var(--bng-black-o4);
  border-radius: var(--bng-corners-2);
  overflow: visible;
  display: flex;
  flex-direction: column;
  height: 100%;
  color: white;

  &.disabled {
    opacity: 0.66;
    pointer-events: none;
  }
}

.section-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: var(--bng-black-o2);
  padding-right: 0.5rem;
  overflow: hidden;
  border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;

  .section-title {
    color: white;
    margin: 0.5rem -0.5rem 0;
    padding-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 0.25rem 0.5rem;
}

.highscores-table {
  display: flex;
  flex-direction: column;
}

.highscores-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.9rem;

  &.highscores-header {
    font-weight: 600;
    opacity: 0.7;
    text-transform: uppercase;
    font-size: 0.75rem;
  }
}

.col-rank {
  flex: 0 0 1.5rem;
  text-align: right;
}

.col-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-vehicle {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
}

.col-time {
  flex: 0 0 6rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  gap: 0.5rem;
  flex: 1;
}

.placeholder-icon {
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.4);
}
</style>
