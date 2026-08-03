<template>
  <BngCard bng-ui-scope="deliveryConfigurator" class="md-content" v-bng-on-ui-nav:back="close">
    <p>{{ $translate.instant("ui.career.deliveryConfigurator.testMessage") }}</p>
        <BngCardHeading style="text-align:left;">{{ $translate.instant("ui.career.deliveryConfigurator.title") }}</BngCardHeading>
    <BngButton  @click="testButton()">{{ $translate.instant("ui.career.deliveryConfigurator.testButton") }}</BngButton>

  </BngCard>
</template>

<script setup>
  import { lua } from '@/bridge'
  import { onMounted, onUnmounted, computed } from "vue"
  import { BngButton, BngCard, BngCardHeading } from '@/common/components/base'
  // import { default as UINavEvents, UI_EVENT_GROUPS } from "@/bridge/libs/UINavEvents"
  import { getUINavServiceInstance, UI_EVENT_GROUPS } from "@/services/uiNav"
  import { vBngOnUiNav } from "@/common/directives"

  import { useUINavScope } from "@/services/uiNav"
  import { $translate } from "@/services/translation"
  useUINavScope('deliveryConfigurator')

  //setup data coming from outside when the screen is opened/started
  //be aware of data types, bools don't work properly maybe?
  const props = defineProps({
    setupData: {
      type: String,
      required: false
    }
  })

  const testButton = () => {
    console.log("Test Button")
    lua.print("Hello!")
  }

  const start = () => {
    console.log("Timo Test Started");
    // UINavEvents.setFilteredEvents(UI_EVENT_GROUPS.focusMoveScalar)
    getUINavServiceInstance().setFilteredEvents(UI_EVENT_GROUPS.focusMoveScalar)
  }

  const kill = () => {
    console.log("Timo Test Kill");
    //lua.career_modules_computer.onMenuClosed()
    // UINavEvents.clearFilteredEvents()
    getUINavServiceInstance().clearFilteredEvents()
  }
  onMounted(start)
  onUnmounted(kill)
</script>

<style scoped lang="scss">
.md-content {
  display: block;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  width:20%;
  height:100%;
  text-align:center;
  color: white;
  background-color: rgba(0,0,0,0.8);
  & :deep(.card-cnt) {
    background-color: rgba(0,0,0,0.0);
  }
}

.currentVehicleSection {
  border: 1px solid rgb(196, 196, 196);;
}

.buttonBox {
  padding:10px;
}
</style>
