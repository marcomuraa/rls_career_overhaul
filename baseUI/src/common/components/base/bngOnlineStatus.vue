<template>
  <BngIcon
    :style="iconStyle"
    :type="isOnline ? icons.globeSimplified : icons.globeSimpleNotSign"
    v-bng-tooltip:top="isOnline ? onlineLabel : offlineLabel"
  />
</template>

<script setup>
import { computed } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import { vBngTooltip } from "@/common/directives"

const props = defineProps({
  online: {
    type: [Boolean, Object],
    default: false,
  },
  onlineLabel: {
    type: String,
    default: "Online",
  },
  offlineLabel: {
    type: String,
    default: "Offline",
  },
  iconSize: {
    type: String,
    default: "1.25em",
  },
})

const isOnline = computed(() => {
  const val = props.online
  if (val && typeof val === "object" && "value" in val) return !!val.value
  return !!val
})

const iconStyle = computed(() => ({
  "--bng-icon-size": props.iconSize,
  padding: 0,
}))
</script>
