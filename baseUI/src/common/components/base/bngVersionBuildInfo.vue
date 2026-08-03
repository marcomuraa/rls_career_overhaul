<template>
  <span class="container" @click="toggleExpanded">
    <span v-if="showBranch && displayBranch && displayBranch !== publicBranch" class="branch" @click.stop>
      <BngIcon
        :style="branchIconStyle"
        :type="icons.branch"
        v-bng-tooltip:top="`${branchTooltipPrefix}${displayBranch}`"
      />
      <span class="branch-label">{{ displayBranch }} • </span>
    </span>
    <span v-if="!expanded">{{ prefix }}{{ displayVersionSimple }}</span>
    <template v-else>
      <span class="sysinfo">{{ prefix }}{{ displayVersion }}</span>
      <span class="sysinfo">{{ displayBuildInfo }}</span>
    </template>
  </span>
</template>

<script setup>
import { computed, ref } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import { vBngTooltip } from "@/common/directives"

const props = defineProps({
  branch: {
    type: [String, Object],
    default: "",
  },
  showBranch: {
    type: Boolean,
    default: true,
  },
  publicBranch: {
    type: String,
    default: "public",
  },
  branchTooltipPrefix: {
    type: String,
    default: "Branch: ",
  },
  iconSize: {
    type: String,
    default: "1.25em",
  },
  versionSimple: {
    type: [String, Object],
    default: "",
  },
  version: {
    type: [String, Object],
    default: "",
  },
  buildInfo: {
    type: [String, Object],
    default: "",
  },
  prefix: {
    type: String,
    default: "Alpha v.",
  },
  startExpanded: {
    type: Boolean,
    default: false,
  },
})

const displayBranch = computed(() => {
  const val = props.branch
  if (val && typeof val === "object" && "value" in val) return `${val.value || ""}`
  return `${val || ""}`
})

const displayVersionSimple = computed(() => {
  const val = props.versionSimple
  if (val && typeof val === "object" && "value" in val) return `${val.value || ""}`
  return `${val || ""}`
})

const displayVersion = computed(() => {
  const val = props.version
  if (val && typeof val === "object" && "value" in val) return `${val.value || ""}`
  return `${val || ""}`
})

const displayBuildInfo = computed(() => {
  const val = props.buildInfo
  if (val && typeof val === "object" && "value" in val) return `${val.value || ""}`
  return `${val || ""}`
})

const branchIconStyle = computed(() => ({
  "--bng-icon-size": props.iconSize,
  padding: 0,
}))

const expanded = ref(props.startExpanded)

function toggleExpanded() {
  expanded.value = !expanded.value
}
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  width: fit-content;
}
.branch {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
}
.sysinfo {
  flex: 0 0 auto;
  font-size: 0.8em;
}
</style>
