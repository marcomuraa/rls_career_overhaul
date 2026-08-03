<template>
  <div class="oneshot-race-options-panel" v-bng-blur>
    <BlurBackground />
    <div class="section-header">
      <BngCardHeading type="ribbon" class="section-title">
        <BngIcon :type="icons.adjust" />
        <span>{{ $tt("ui.quickrace.setting") }}</span>
      </BngCardHeading>
    </div>
    <div class="section-content" :class="{ disabled: !middle }">
      <template v-if="middle">
        <div class="option-row" v-for="field in visibleFields" :key="field.key">
          <label class="option-label">{{ $tt(field.labelKey) }}</label>
          <BngSwitch
            v-if="field.type === 'switch'"
            :model-value="settings[field.key]"
            @update:modelValue="v => emit('update-setting', field.key, v)"
          />
          <template v-else-if="field.type === 'lapCount'">
            <BngSmartSelect
              v-if="middle.closed"
              :model-value="settings[field.key]"
              :items="field.options"
              :threshold="4"
              @change="v => emit('update-setting', field.key, v)"
            />
            <span v-else class="option-static-value">{{ middle.uniqueLapCountString || settings[field.key] }}</span>
          </template>
          <BngSmartSelect
            v-else-if="field.type === 'tod'"
            :model-value="settings[field.key]"
            :items="todOptions(field)"
            :threshold="4"
            @change="v => emit('update-setting', field.key, v)"
          />
          <span v-if="field.descriptionKey" class="option-description">{{ $tt(field.descriptionKey) }}</span>
        </div>
      </template>
      <div v-else class="placeholder-content">
        <BngIcon :type="icons.adjust" class="placeholder-icon" />
        <p class="placeholder-text">{{ $tt(mode.selectMiddleLabelKey) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngCardHeading, BngIcon, BngSwitch, BngSmartSelect, icons } from "@/common/components/base"
import { vBngBlur } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import { $translate } from "@/services/translation"

const props = defineProps({
  mode: {
    type: Object,
    required: true,
  },
  middle: {
    type: Object,
    default: null,
  },
  settings: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(["update-setting"])

const mode = props.mode

const visibleFields = computed(() => props.mode.settingsSchema.filter(field => field.visible(props.middle)))

function todOptions(field) {
  return field.options.map(option => ({ label: $translate.instant(option.labelKey), value: option.value }))
}
</script>

<style scoped lang="scss">
@use "@/styles/modules/mixins" as *;

.oneshot-race-options-panel {
  position: relative;
  background-color: var(--bng-black-o4);
  border-radius: var(--bng-corners-2);
  overflow: visible;
  display: flex;
  flex-direction: column;
  height: 100%;
  color: white;
}

.section-header {
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background-color: var(--bng-black-o2);
  border-radius: var(--bng-corners-2) var(--bng-corners-2) 0 0;

  .section-title {
    color: white;
    margin: 0.5rem -0.5rem 0;
    padding-bottom: 0.5rem;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.section-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0.5rem;
  overflow-y: auto;

  &.disabled {
    opacity: 0.66;
    pointer-events: none;
  }
}

.option-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.option-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.option-static-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.option-description {
  flex: 1 1 100%;
  font-size: 0.75rem;
  opacity: 0.7;
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

.placeholder-text {
  font-size: 0.9rem;
  font-style: italic;
  margin: 0;
}
</style>
