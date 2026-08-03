<template>
  <InfoCard :header="panel.header"  header-type="ribbon" :no-blur="true" :nav-scroll="false">
    <template #content>
      <div class="slip-container">
        <Timeslip :slip="panel.timeslip" />
        <BngIcon class="save" :type="icons.floppyDisk" @click="screenshot" />
      </div>
    </template>
 </InfoCard>
</template>

<script setup>
import { lua } from "@/bridge"
import InfoCard from "../components/InfoCard.vue"
import { Timeslip } from "@/modules/apps"
import { BngIcon, icons } from "@/common/components/base"

defineProps({
  panel: {
    type: Object,
    required: true,
  }
})

const screenshot = lua.gameplay_drag_dragBridge.screenshotTimeslip
</script>

<style scoped lang="scss">
.slip-container {
  position: relative;
  overflow-y: auto;
  max-height: 80vh;
}

.save {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  opacity: 0.25;
  cursor: pointer;
  z-index: 1;
  color: gray;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.7;
  }
}
</style>
