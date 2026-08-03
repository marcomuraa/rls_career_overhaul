<template>
  <div v-bng-on-ui-nav:back="goBack" class="center-wrap">
    <div class="others">
      <BngScreenHeading class="header" :divider="true" type="line">
        {{ $tt("ui.mainmenu.more") }}
      </BngScreenHeading>
      <div class="buttons" :class="{ 'controls-disabled': isLoading }">
        <BackAside @click="goBack" />

        <MenuButton
          v-if="!$simplemenu && multiplayerAvailable"
          bng-scoped-nav-autofocus
          size="medium"
          icon-id="gamepad"
          v-bng-route-target="'menu.multiplayer'"
        >
          {{ $tt("ui.playmodes.multiplayer") }}
        </MenuButton>

        <MenuButton
          size="medium"
          icon-id="rallyHelmet"
          @click="rallyDisclaimer()"
        >{{ $tt("ui.playmodes.rally") }}</MenuButton>
        <MenuButton
          size="medium"
          icon-id="gamepad"
          :tag="$tt('ui.playmodes.new')"
          v-bng-route-target="'menu.gameplay'"
        >{{ $tt("ui.menu.gameplaySelector.title") }}</MenuButton>
        <MenuButton
          size="medium"
          icon-id="stopwatchArrows02"
          v-show="!$simplemenu"
          v-bng-route-target="'menu.quickraceWizard'"
        >{{ $tt("ui.playmodes.quickrace") }}</MenuButton>
        <MenuButton
          size="medium"
          :disabled="inGarage"
          :highlighted="inGarage"
          icon-id="carDealer"
          v-bng-route-target.id="'garage'"
          @click="startGarage()"
        >{{ $tt("ui.mainmenu.garage") }}</MenuButton>
        <MenuButton
          size="medium"
          icon-id="bus"
          v-show="!$simplemenu"
          v-bng-route-target="'menu.busRouteWizard'"
        >{{ $tt("ui.playmodes.bus") }}</MenuButton>
        <MenuButton
          size="medium"
          icon-id="lightrunner"
          v-show="!$simplemenu"
          v-bng-route-target="'menu.lightrunnerWizard'"
          >{{ $tt("ui.playmodes.lightRunner") }}</MenuButton>
          <MenuButton
          size="medium"
          :disabled="inGarage"
          icon-id="autobahn"
          v-show="!$simplemenu"
          @click="startTrackBuilder()"
        >{{ $tt("ui.playmodes.trackBuilder") }}</MenuButton>
        <MenuButton
          size="medium"
          icon-id="movieCamera"
          v-bng-route-target="'menu.replay'"
        >{{ $tt("ui.dashboard.replay") }}</MenuButton>
        <!--
        <MenuButton
          tag="DEV ONLY Fallback" tag-orange
          size="medium"
          icon-id="road"
          v-bng-route-target="'menu.levels'"
        >{{ $tt("ui.playmodes.freeroam") }}</MenuButton>
        <MenuButton
          tag="DEV ONLY Fallback" tag-orange
          size="medium"
          icon-id="road"
          v-bng-route-target="'menu.freeroamselector'"
        >{{ $tt("Freeroam (Vue)") }}</MenuButton>
        -->
        <template v-for="item in normalizedAddons" :key="item.key">
          <MenuButton
            v-if="item.routeTarget"
            v-show="!$simplemenu && !item.hideInSimpleMenu"
            size="medium"
            :icon-id="item.iconId"
            :icon="item.icon"
            v-bng-route-target="item.routeTarget"
            :tag="$t('ui.mainmenu.mod')" tag-dark-green
          >{{ item.title }}</MenuButton>
          <MenuButton
            v-else
            v-show="!$simplemenu && !item.hideInSimpleMenu"
            size="medium"
            :icon-id="item.iconId"
            :icon="item.icon"
            @click="runAddonAction(item)"
            :tag="$t('ui.mainmenu.mod')" tag-dark-green
          >{{ item.title }}</MenuButton>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch, inject } from "vue"
import { BngScreenHeading, ACCENTS } from "@/common/components/base"
import { vBngOnUiNav, vBngRouteTarget } from "@/common/directives"
import { useBridge } from "@/bridge"
import { SysInfo } from "@/services"
import { startLoading, waitForLoadingScreenFadeIn } from "@/services/screenCover"
import { ACTIONS_BY_UI_EVENT } from "@/services/uiNav/constants"
import { useUINavBlocker } from "@/services/uiNavTracker"
import MenuButton from "../components/MenuButton.vue"
import BackAside from "../components/BackAside.vue"
import { $translate } from "@/services"
import { openConfirmation } from "@/services/popup"
import RallyDisclaimerContent from "../components/RallyDisclaimerContent.vue"
const { lua } = useBridge()
const $simplemenu = inject("$simplemenu")

const props = defineProps({
  addons: Object, // object with named buttons
})

const inGarage = SysInfo.gameState.value === "garage"
const multiplayerAvailable = SysInfo.multiplayerAvailable
const uiNavBlocker = useUINavBlocker()

const goBack = () => {
  lua.extensions.ui_router.back()
}

const isLoading = ref(false)

const runWithLoadingScreen = async (action) => {
  if (isLoading.value) return
  isLoading.value = true
  await startLoading(async () => {
    try {
      await waitForLoadingScreenFadeIn()
      await action()
    } finally {
      isLoading.value = false
    }
  })
}

watch(isLoading, loading => {
  if (loading) {
    uiNavBlocker.blockOnly(Object.keys(ACTIONS_BY_UI_EVENT))
  } else {
    uiNavBlocker.clear()
  }
}, { immediate: true })

const startGarage = () => runWithLoadingScreen(() => lua.extensions.gameplay_garageMode.start())
const startTrackBuilder = () => runWithLoadingScreen(() => lua.freeroam_freeroam.startTrackBuilder("glow_city"))

// Addon actions may be: function | string state | { state, params } | [state, ...]
// Route-shaped actions go through the directive; functions stay imperative.
const normalizedAddons = computed(() => {
  const out = []
  if (!props.addons) return out
  for (const key in props.addons) {
    const item = props.addons[key]
    const action = item?.action
    let routeTarget = null
    let manualHandler = null

    if (typeof action === "function") {
      manualHandler = action
    } else if (typeof action === "string") {
      routeTarget = action
    } else if (Array.isArray(action)) {
      if (action[0]) routeTarget = action[0]
    } else if (action && typeof action === "object" && action.state) {
      routeTarget = action.params
        ? { route: action.state, params: action.params }
        : action.state
    }

    out.push({
      key,
      title: item?.title,
      iconId: item?.iconId,
      icon: item?.icon,
      routeTarget,
      manualHandler,
      hideInSimpleMenu: item?.hideInSimpleMenu,
    })
  }
  return out
})

function runAddonAction(item) {
  if (typeof item?.manualHandler === "function") {
    nextTick(item.manualHandler)
  }
}

async function rallyDisclaimer() {
  if (await openConfirmation(
    $translate.instant("ui.rally.experimentalTitle"),
    { component: RallyDisclaimerContent },
    [
      { label: $translate.instant("ui.common.okay"), value: true, default: true },
      { label: $translate.instant("ui.common.cancel"), value: false, isCancel: true, extras: { accent: ACCENTS.secondary } },
    ],
    "rally",
  ))
  setTimeout(() => {
    lua.ui_gameplaySelector_general.openRallySelector()
  }, 300)
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

$button-width: 16em;
$buttons-per-row: 4;
$rem: calc-ui-rem();

.center-wrap {
  align-self: center;

  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  margin: 0 calc-ui-rem(15);
}

.others {
  width: fit-content;
  max-width: calc(100% - 2em);
  margin-bottom: 3.5em;
  margin-left: auto;
  margin-right: auto;
}

.header {
  margin-left: calc-ui-rem(-4.25);
}

.buttons {
  position: relative;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: start;
  max-width: calc($button-width * $buttons-per-row + 1em * $buttons-per-row);
}

.controls-disabled {
  pointer-events: none;
}
</style>
