<template>
  <span class="bng-service-providers-user">
    <template v-for="(info, key) in serviceProviders" :key="key">
      <span v-if="serviceProvidersOnline && serviceProvidersOnline[key]" class="provider">
        <BngImageAsset v-if="showProviderIcons" :src="`${providerIconBasePath}${key}${providerIconSuffix}`" />
        <span class="provider-name">{{ info && info.playerName ? info.playerName : "" }}</span>
      </span>
    </template>
  </span>
</template>

<script setup>
import { BngImageAsset } from "@/common/components/base"

defineProps({
  serviceProviders: {
    type: Object,
    default: () => ({}),
  },
  serviceProvidersOnline: {
    type: Object,
    default: () => ({}),
  },
  showProviderIcons: {
    type: Boolean,
    default: true,
  },
  providerIconBasePath: {
    type: String,
    default: "images/mainmenu/",
  },
  providerIconSuffix: {
    type: String,
    default: "icon.png",
  },
})
</script>

<style lang="scss" scoped>
.provider {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
}
</style>
