<template>
  <div
    v-show="visible"
    class="info-bar"
    bng-no-nav="true"
  >

    <div v-if="showSysInfo" class="info-bar-stats">
      <BngOnlineStatus :online="SysInfo.online" />
      <BngServiceProvidersUser
        v-if="!hideServiceProvidersUser"
        :service-providers="SysInfo.serviceProviders.value"
        :service-providers-online="SysInfo.serviceProvidersOnline.value"
      />
      <span v-if="!hideServiceProvidersUser && (SysInfo.online.value || SysInfo.serviceProvidersOnline.value.any)" class="divider" />
      <BngVersionBuildInfo :branch="activeBranch" :version-simple="SysInfo.versionSimple" :version="SysInfo.version" :build-info="SysInfo.buildInfo" />
    </div>

    <div class="spacer"></div>

    <div v-if="hints.length" v-show="hintsDisplayed" class="info-bar-buttons" bng-no-child-nav="true">
      <Hint v-for="item in hints" :key="item.id" :data="item" ref="hintRefs" />
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { useRoute } from "vue-router"
import SysInfo from "@/services/sysInfo"
import { useInfoBar } from "@/services/infoBar"
import { BngOnlineStatus, BngServiceProvidersUser, BngVersionBuildInfo } from "@/common/components/base"
import Hint from "../components/Hint.vue"
import { storeToRefs } from "pinia"

const infoBarObj = useInfoBar()
const { visible, showSysInfo: storeShowSysInfo, hints } = storeToRefs(infoBarObj)

const showSysInfo = computed(() => route.meta?.infoBar?.showSysInfo !== undefined ? route.meta.infoBar.showSysInfo : storeShowSysInfo.value)

const activeBranch = computed(() => {
  const provs = SysInfo.serviceProviders.value
  const online = SysInfo.serviceProvidersOnline.value
  if (!provs || !online) return ""

  for (const [key, info] of Object.entries(provs)) {
    if (online[key] && info && info.branch) return info.branch
  }

  return ""
})

const route = useRoute()
const hideServiceProvidersUser = computed(() => route.meta?.infoBar?.hideServiceProvidersUser === true)
const hintRefs = ref([])
const hintsDisplayed = computed(() => hintRefs.value.some(ref => ref.displayed))
</script>

<style lang="scss" scoped>
$height: 2.9em;
$bg-grad: transparent 1.05rem, #f60 1.15rem 1.4rem, var(--info-grad-bg) 1.5rem;
$bg-grad-pad: 1.75rem;

.info-bar {
  position: absolute;
  bottom: 1em;
  width: 100%;
  height: $height;
  display: flex;
  flex-direction: row;
  > * {
    height: $height;
    line-height: $height;
    overflow: hidden;
  }
  --info-grad-bg: var(--bng-black-o6);

  .spacer {
    flex: 1 0 0;
  }

  .info-bar-stats,
  .info-bar-buttons {
    color: white;
    pointer-events: all;
    span {
      padding-left: 0.25em;
      padding-right: 0.25em;
    }
  }

  .info-bar-stats {
    position: relative;
    flex: 0 0 auto;
    padding-left: 1.4em;
    padding-right: $bg-grad-pad;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap:0.5em;
    // border-left: 4px solid #f60;
    border-top-left-radius: var(--bng-corners-2);
    border-bottom-left-radius: var(--bng-corners-2);
    background-image: linear-gradient(-67deg, $bg-grad);
    .sysinfo {
      font-size: 0.8em;
    }
  }

  .info-bar-buttons {
    position: relative;
    padding-left: $bg-grad-pad;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-right: 1em;
    background-image: linear-gradient(113deg, $bg-grad);
    border-top-right-radius: var(--bng-corners-2);
    border-bottom-right-radius: var(--bng-corners-2);
    span > span {
      padding: 0.5em 0;
    }
    .binding:hover {
      background-color: var(--bng-orange-b400);
    }
    .binding span {
      padding-left: 0;
      padding-right: 0;
    }
  }

  .divider {
    display: inline-block;
    width: 0.25rem;
    height: 1.8em;
    margin-left: 0.5rem;
    margin-right: 0.2rem;
    padding: 0 !important;
    background-color: #f60;
    transform: skewX(-23deg);
  }
}
</style>
