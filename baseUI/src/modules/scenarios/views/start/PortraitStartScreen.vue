<template>
  <div class="portrait-start" v-if="data">
    <div class="portrait-title">
      {{ $tt(data.name) }}
    </div>

    <div class="portrait-panel">
      <img
        v-if="data.portraitImg && data.portraitImg.start"
        class="portrait-img"
        :src="'/' + data.portraitImg.start"
      />

      <div class="portrait-text">
        <DynamicComponent v-if="data.portraitText" :template="data.portraitText" />
      </div>

      <ScenarioStartActions
        :data="data"
        :button-text="buttonText"
        :show-start-button="showStartButton"
        @play="$emit('play')"
        @extra-button="cmd => $emit('extra-button', cmd)"
      />
    </div>

    <ScenarioUserSettingsPanel
      v-if="data.userCheckSettings"
      class="portrait-settings"
      :user-check-settings="data.userCheckSettings"
      :user-settings="userSettings"
      @apply-setting="key => $emit('apply-setting', key)"
    />

    <ScenarioProgressPanel
      v-if="data.formattedProgress"
      class="portrait-progress"
      :data="data"
    />
  </div>
</template>

<script setup>
import { DynamicComponent } from "@/common/components/utility"
import ScenarioStartActions from "../../components/ScenarioStartActions.vue"
import ScenarioUserSettingsPanel from "../../components/ScenarioUserSettingsPanel.vue"
import ScenarioProgressPanel from "../../components/ScenarioProgressPanel.vue"

defineProps({
  data: { type: Object, required: true },
  userSettings: { type: Object, default: () => ({ values: {}, options: {} }) },
  showStartButton: { type: Boolean, default: true },
  buttonText: { type: String, default: "" },
})

defineEmits(["play", "extra-button", "apply-setting"])
</script>

<style lang="scss" scoped>
.portrait-start {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 2rem;
  box-sizing: border-box;
  gap: 1rem;
}

.portrait-title {
  width: 80%;
  padding: 0.5rem 1rem;
  font-size: 3em;
  font-weight: bold;
  color: white;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.8) 350px, transparent);
}

.portrait-panel {
  width: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1rem;
  gap: 1rem;
  flex: 1 1 auto;
  min-height: 0;
}

.portrait-img {
  margin-bottom: 1rem;
  max-width: 80%;
  max-height: 300px;
}

.portrait-text {
  font-size: 1.3em;
  overflow: auto;
  flex: 1 1 auto;
}

.portrait-settings {
  position: absolute;
  left: 400px;
  width: 350px;
  bottom: 2rem;
  min-height: 100px;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1rem;
}

.portrait-progress {
  position: absolute;
  right: 2rem;
  top: 2rem;
  width: 30rem;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1rem;
}
</style>
