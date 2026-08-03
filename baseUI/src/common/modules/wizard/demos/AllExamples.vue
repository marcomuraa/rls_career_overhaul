<template>
  <Tabs class="bng-tabs">
    <Simple tab-heading="Simple" />
    <Comprehensive tab-heading="Comprehensive" />
    <AutoSkip tab-heading="Auto-Skip" />
    <CentralizedModel tab-heading="Centralized v-model" />
    <IndividualModel tab-heading="Individual v-model" />
    <OnlineConsent tab-heading="Online Consent Example" />
    <ButtonLayout tab-heading="Button Layout Example" />
  </Tabs>
</template>

<script setup>
import { Tabs } from "@/common/components/utility"
import Simple from "./Simple.vue"
import Comprehensive from "./Comprehensive.vue"
import AutoSkip from "./AutoSkip.vue"
import CentralizedModel from "./CentralizedModel.vue"
import IndividualModel from "./IndividualModel.vue"
import OnlineConsent from "@/modules/onlineConsent/views/OnlineConsentView.vue"
import ButtonLayout from "@/modules/buttonLayout/views/ButtonLayoutView.vue"
</script>

<style lang="scss" scoped>
.bng-tabs {
  position: fixed;
  top: 0;
  left: 15em;
  right: 0;
  bottom: 0;
}
</style>
