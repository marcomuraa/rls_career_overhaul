<template>
  <div
    v-bng-scoped-nav="{ scopeId: 'scenario-start-settings', type: 'container' }"
    class="scenario-user-settings-panel"
  >
    <div
      v-for="(val, key) in userCheckSettings"
      :key="key"
      class="setting-row"
    >
      <div class="setting-msg">{{ val.msg }}</div>
      <select
        :value="userSettings.values?.[key]"
        @change="onChange(key, $event.target.value)"
      >
        <option
          v-for="(optionKey, idx) in userSettings.options?.[key]?.modes?.keys || []"
          :key="optionKey"
          :value="optionKey"
        >
          {{ $tt(userSettings.options[key].modes.values[idx]) }}
        </option>
      </select>
      <div class="setting-description">
        {{ val.options?.[userSettings.values?.[key]] }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { vBngScopedNav } from "@/common/directives"

const props = defineProps({
  userCheckSettings: { type: Object, required: true },
  userSettings: { type: Object, default: () => ({ values: {}, options: {} }) },
})

const emit = defineEmits(["apply-setting"])

function onChange(key, value) {
  if (!props.userSettings.values) return
  props.userSettings.values[key] = value
  emit("apply-setting", key)
}
</script>

<style lang="scss" scoped>
.scenario-user-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: white;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.setting-msg {
  font-weight: bold;
}

select {
  background-color: white;
  color: black;
  padding: 0.25rem;
}

.setting-description {
  font-size: 0.9em;
  opacity: 0.85;
}
</style>
