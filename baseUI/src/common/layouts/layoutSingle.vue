<template>
  <div class="layout-wrapper" :class="{ 'layout-safezones': safezones }">
    <Background v-if="blur" v-bng-blur="blur" />
    <div class="layout-content">
      <slot>Content here</slot>
    </div>
    <InfoBar class="layout-info-bar" v-if="showInfoBar" />
  </div>
</template>

<script>
export const LAYOUT_ALIGNMENTS = {
  // setting value : justify-content value
  left: "flex-start",
  right: "flex-end",
  center: "center",
}
</script>

<script setup>
import { computed, inject, onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"
import { Background } from "@/common/components/utility"
import { vBngBlur } from "@/common/directives"
import InfoBar from "@/common/modules/infobar/components/InfoBar.vue"

defineProps({
  blur: {
    type: Boolean,
    default: false,
  },
  safezones: {
    type: Boolean,
    default: true,
  },
})

const layoutSinglePresence = inject("layoutSinglePresence", null)
const route = useRoute()
// TODO: use the routeData infoBar settings instead of the route meta
const showInfoBar = computed(() => route.meta?.infoBar?.visible === true)

onMounted(() => layoutSinglePresence?.register?.())
onUnmounted(() => layoutSinglePresence?.unregister?.())
</script>

<style lang="scss">
// set defaults for --layout-content-* in App.vue instead
$content-max-width: var(--layout-content-width);
$content-h-position: var(--content-h-position, var(--layout-content-alignment));
$content-flow: var(--content-flow, row);

// do not override from outside, it must be controlled by App.vue ONLY
$safezone: var(--safezone);

.layout-wrapper {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;

  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 1em;
  // align-items: stretch;
  align-items: $content-h-position;

  > .layout-content {
    flex: 1 1 auto;
    position: relative;
    display: flex;
    flex-direction: $content-flow;
    flex-wrap: nowrap;
    width: 100%;
    max-width: max(33.4%, $content-max-width);
    min-height: 0;
    overflow: hidden;
  }

  .layout-info-bar.info-bar {
    position: relative;
    align-self: stretch;
    bottom: unset;
  }
}

.layout-safezones {
  padding: $safezone;
}
</style>
