<template>
  <div class="drag-timeslip-tutorial-popup">
    <AspectRatio
      class="drag-timeslip-media"
      ratio="1.46:1"
      slot-v-align="top"
      :slot-scroll="false"
      :external-image="props.popup?.image || null"
      image-mode="cover"
    >
      <div class="drag-timeslip-background" />
      <div class="drag-timeslip-content">
        <div class="drag-timeslip-panel">
          <Timeslip :slip="slipData" />
        </div>
        <div class="drag-timeslip-text-panel">
          <div class="drag-timeslip-text" v-html="textHtml" />
        </div>
      </div>
    </AspectRatio>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { Timeslip } from "@/modules/apps"
import { AspectRatio } from "@/common/components/utility"
import { $content, $translate } from "@/services"

defineOptions({ name: "DragTimeslipTutorialPopup" })

const props = defineProps({
  popup: {
    type: Object,
    default: () => ({}),
  },
})

const defaultText = "ui.career.tutorial.popup.dragTimeslip.defaultText"
const textHtml = computed(() => $content.bbcode.parse($translate.instant(props.popup?.text || defaultText)))

const fallbackSlipData = computed(() => ({
  dragType: "timeTrial",
  stripInfo: {
    event: $translate.instant("ui.career.tutorial.popup.dragTimeslip.event"),
    class: $translate.instant("ui.career.tutorial.popup.dragTimeslip.class"),
  },
  racerInfos: [
    {
      laneNum: 1,
      lane: $translate.instant("ui.career.tutorial.popup.dragTimeslip.lane.left"),
      licenseText: $translate.instant("ui.career.tutorial.popup.dragTimeslip.license.tutorial"),
      name: $translate.instant("ui.career.tutorial.popup.dragTimeslip.player"),
      finalTime: 12.742,
      timers: {
        time_60: "2.014",
        time_330: "5.521",
        time_1_8: "8.311",
        time_1000: "10.710",
        time_1_4: "12.742",
      },
    },
    {
      laneNum: 2,
      lane: $translate.instant("ui.career.tutorial.popup.dragTimeslip.lane.right"),
      licenseText: $translate.instant("ui.career.tutorial.popup.dragTimeslip.license.reference"),
      name: $translate.instant("ui.career.tutorial.popup.dragTimeslip.rival"),
      finalTime: 13.128,
      timers: {
        time_60: "2.109",
        time_330: "5.702",
        time_1_8: "8.611",
        time_1000: "11.013",
        time_1_4: "13.128",
      },
    },
  ],
  env: {
    tempC: 22,
    tempF: 71.6,
  },
}))

const slipData = computed(() => props.popup?.slip || fallbackSlipData.value)
</script>

<style lang="scss" scoped>
.drag-timeslip-tutorial-popup {
  width: 100%;
  box-sizing: border-box;
}

.drag-timeslip-media {
  height: 66vh;
  max-height: calc(100vh - 14rem);
}

.drag-timeslip-background {
  position: absolute;
  inset: 0;
  background: rgba(var(--bng-black-rgb), 0.68);
  pointer-events: none;
}

.drag-timeslip-content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 1rem;
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: stretch;
}

.drag-timeslip-panel {
  flex: 0 0 45%;
  min-width: 0;
}

.drag-timeslip-text-panel {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
}

.drag-timeslip-text {
  width: 100%;
  border-radius: 0.5rem;
  background: rgba(var(--bng-off-black-rgb), 0.8);
  border-left: 2px solid rgba(var(--bng-off-white-rgb), 1);
  color: rgba(var(--bng-off-white-rgb), 1);
  font-size: 1.25rem;
  line-height: 1.25;
  padding: 1rem;
  box-sizing: border-box;
}
</style>
