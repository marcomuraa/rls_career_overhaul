<template>
  <InfoCard class="dial-card" :header="panel.header" header-type="ribbon">
    <template #content>
      <div>
        {{ $ctx_t(panel.text) }}
      </div>
      <div class="list">
        <BngRow
          v-for="dial in panel.dials"
          :key="dial.key"
          class="setting-row"
          :label="$t(dial.label)"
          :disabled="dial.disabled"
          vertical
        >
          <BngInput
            :model-value="clampedValue(dial)"
            :min="0"
            :max="60"
            suffix="s"
            type="number"
            :step="0.01"
            :show-external-button="false"
            @update:modelValue="onDialInput(dial, $event)" />
        </BngRow>
      </div>
    </template>
  </InfoCard>
</template>

<script setup>
import { $translate } from "@/services"
import { BngInput, BngRow } from "@/common/components/base"
import { lua, useBridge } from "@/bridge"
import InfoCard from "../components/InfoCard.vue"

const props = defineProps({
  panel: {
    type: Object,
    required: true,
  },
})

// toFixed(3) + parseFloat avoids floating point artifacts (e.g. 12.229999999999999) that Math.round alone can leave behind
function clampedValue(dial) {
  return parseFloat(Number(dial.value).toFixed(3))
}

function onDialInput(dial, value) {
  dial.value = clampedValue({ value })
  lua.extensions.hook("onDialSetByDialPanel", dial)
}
</script>

<style scoped lang="scss">
.setting-row {
  width: 96%;
}
</style>
