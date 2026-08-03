<template>
  <div class="center-wrap">
    <div class="primary">
      <MenuButton
        size="big"
        icon-id="keys1"
        :bg-img="IMG_PATH + 'experiences.jpg'"
        :tag="$t('ui.playmodes.new')"
        sound-class="bng_main_primary"
        v-bng-route-target="'menu.discover'"
        bng-scoped-nav-autofocus
      >{{ $tt("ui.playmodes.quickStartExperiences") }}</MenuButton>
      <MenuButton
        size="big"
        icon-id="road"
        :bg-img="IMG_PATH + 'freeroam.jpg'"
        sound-class="bng_main_primary"
        v-bng-route-target="defaultWizardRoute"
      >{{ $tt("ui.playmodes.freeroam") }}</MenuButton>
      <MenuButton
        size="big"
        icon-id="cup"
        :bg-img="IMG_PATH + 'career.jpg'"
        sound-class="bng_main_primary"
        v-bng-route-target.id="'career.profiles'"
        :tag="isSimpleMenu ? undefined : $t('ui.career.experimental.name')"
        @click="careerPrompt()"
      >{{ $tt("ui.playmodes.career") }}</MenuButton>
      <MenuButton
        size="big-stacked"
        icon-id="BNGFolder"
        :bg-img="IMG_PATH + 'others.jpg'"
        sound-class="bng_main_primary"
        v-bng-route-target="'menu.others'"
      >{{ $tt("ui.mainmenu.more") }}</MenuButton>
    </div>
  </div>
</template>

<script setup>
import { nextTick, computed, inject, ref, unref } from "vue"
import { ACCENTS } from "@/common/components/base"
import { vBngRouteTarget } from "@/common/directives"
import MenuButton from "../components/MenuButton.vue"
import { $translate } from "@/services"
import { openExperimental } from "@/services/popup"
import { useSettings } from "@/services/settings"
import { useBridge } from "@/bridge"

const { lua } = useBridge()

const $simplemenu = inject("$simplemenu", ref(false))
const isSimpleMenu = computed(() => unref($simplemenu))

const IMG_PATH = "images/mainmenu/"

const settings = useSettings()
const WIZARD_ROUTE_BY_STEP = Object.freeze({
  level: "menu.freeroamLevels",
  vehicle: "menu.freeroamLevels.vehicles",
  options: "menu.freeroamLevels.vehicles.options",
  multiplayer: "menu.freeroamLevels.vehicles.options.multiplayer",
})
const defaultWizardRoute = computed(() => {
  const configuredStep = settings.getValue("freeroamSetupDefaultStep") || "level"

  if (isSimpleMenu.value && configuredStep === "multiplayer") {
    return WIZARD_ROUTE_BY_STEP.level
  }

  return WIZARD_ROUTE_BY_STEP[configuredStep] || WIZARD_ROUTE_BY_STEP.level
})

const navigate = (state, params = undefined) => nextTick(() => lua.extensions.ui_router.navigate(state, params || null, null))

async function careerPrompt() {
  if (isSimpleMenu.value) {
    navigate("career.profiles")
    return
  }

  if (await openExperimental(
    $translate.instant("ui.career.experimentalTitle"),
    $translate.instant("ui.career.experimentalPrompt"),
    [
      { label: $translate.instant("ui.common.no"), value: false, extras: { cancel: true, accent: ACCENTS.secondary } },
      // { label: "Enter and don't show this again", value: true },
      { label: $translate.instant("ui.career.experimentalAgree"), value: true, extras: { default: true } },
    ],
  ))
    // navigate("menu.career")
    navigate("career.profiles")
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

$rem: calc-ui-rem();

.center-wrap {
  align-self: center;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  margin: 0 calc-ui-rem(15);
}

.primary {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  min-width: calc-ui-rem(64);
  margin-bottom: calc-ui-rem(2);

  padding-right: 0.5em; // this is to compensate stacked button reduced size
}

.extras {
  color: white;
  margin-bottom: $rem;
  :deep(.card-cnt) {
    position: relative;
    max-width: 80em;
    padding: 1em;
    padding-top: 0;
    background-color: rgba(var(--bng-ter-blue-gray-800-rgb), 0.8);
    box-shadow: inset 0 0 0 calc-ui-rem(0.0625) rgba(var(--bng-ter-blue-gray-400-rgb), 0.6);
  }
}

.extra-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc-ui-rem(14), 1fr));
  align-items: stretch;
  justify-content: start;
  pointer-events: all;
  // &::after {
  //   content: "";
  //   flex: 1 1 calc(100% - 18.75rem - 1rem);
  // }
  :deep(.mainmenu-button) {
    height: auto;
    display: inline-flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    overflow: hidden;
    > * {
      flex: 0 1 auto;
    }
    .icon {
      height: 100%;
      max-height: 1.5em;
      margin-right: 0.3em;
    }
    .text {
      white-space: nowrap;
    }
  }
}

.secondary {
  margin-bottom: calc-ui-rem(2);
  --shelf-height: #{calc-ui-rem(5)};
}
</style>
