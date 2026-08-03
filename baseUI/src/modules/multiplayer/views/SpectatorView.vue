<template>
  <LayoutMenu
    class="spectator-layout"
    :show-topbar="false"
    nav-scope="spectator-root"
  >
    <div class="spectator-hud">
      <SpectatorTopBanner :player-name="currentPlayerName" />

      <SpectatorBottomBar
        :camera-modes="cameraModes"
        :current-camera-mode="currentCameraMode"
        :ui-modes="uiModes"
        :current-ui-mode="currentUiMode"
        :player-count="players.length"
        @cycle="onCycle"
        @set-camera-mode="onSetCameraMode"
        @set-ui-mode="onSetUiMode"
      />
    </div>
  </LayoutMenu>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { LayoutMenu } from "@/common/layouts"
import { useEvents } from "@/services/events"
import { useRouteDataStore } from "@/services/routeData"
import { useAppLayoutsStore } from "@/modules/apps/appLayoutsStore"
import { lua } from "@/bridge"
import { $translate } from "@/services/translation"
import SpectatorTopBanner from "../components/spectator/SpectatorTopBanner.vue"
import SpectatorBottomBar from "../components/spectator/SpectatorBottomBar.vue"

const events = useEvents()
const routeDataStore = useRouteDataStore()
const appLayouts = useAppLayoutsStore()

const players = ref([])
const currentPlayerIndex = ref(0)
const cameraModes = ref([])
const currentCameraMode = ref("")
const currentUiMode = ref("complete")

const uiModes = [
  { value: "complete", label: $translate.instant("ui.multiplayer.spectator.uiComplete") },
  { value: "minimalist", label: $translate.instant("ui.multiplayer.spectator.uiMinimalist") },
]

const currentPlayerName = computed(() => {
  if (currentPlayerIndex.value < 1 || currentPlayerIndex.value > players.value.length) return ""
  return players.value[currentPlayerIndex.value - 1]?.playerName || ""
})

function applyState(state) {
  if (!state) return
  players.value = state.players || []
  currentPlayerIndex.value = state.currentPlayerIndex || 0
  cameraModes.value = state.cameraModes || []
  currentCameraMode.value = state.currentCameraMode || ""
}

events.on("SpectatorViewData", applyState)

onMounted(async () => {
  const initial = routeDataStore.data?.spectator
  if (initial) {
    applyState(initial)
  } else {
    const state = await lua.multiplayer_gamemodes_utils_spectator.getSpectatorViewData()
    applyState(state)
  }
})

function onCycle(direction) {
  lua.multiplayer_gamemodes_utils_spectator.cyclePlayer(direction)
}

function onSetCameraMode(modeName) {
  lua.multiplayer_gamemodes_utils_spectator.setCameraMode(modeName)
}

function onSetUiMode(mode) {
  currentUiMode.value = mode
  appLayouts.setVisible(mode === "complete")
}

onUnmounted(() => {
  appLayouts.setVisible(true)
})
</script>

<style lang="scss" scoped>
.spectator-layout {
  --content-max-width: unset;

  pointer-events: none;
  > * > * {
    pointer-events: auto;
  }
}

.spectator-hud {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
    pointer-events: none;
  }

  > :first-child {
    position: absolute;
    top: 7%;
    z-index: 1;
  }

  > :last-child {
    position: absolute;
    top: 90%;
    z-index: 1;
  }
}
</style>
