<template>
  <Teleport to="body">
    <div v-if="showDebug" id="lua-router-debug">
      <div v-show="isOpen" class="main">
        <div v-if="currentRoute">Current Route: {{ navigationState?.currentRoute?.name }}</div>
        <hr />
        <h3>History</h3>
        <div v-if="navigationState && navigationState.backwardRoutes">
          <div v-for="(route, index) in navigationState.backwardRoutes" :key="index">{{ route.name }}</div>
        </div>
        <h3>Forward</h3>
        <div v-if="navigationState && navigationState.forwardRoutes">
          <div v-for="(route, index) in navigationState.forwardRoutes" :key="index">{{ route.name }}</div>
        </div>
        <div>
          <button @click="Lua.extensions.ui_router.back()">Back</button>
          <button @click="Lua.extensions.ui_router.forward()">Forward</button>
          <button @click="Lua.extensions.ui_router.resetStates()">Reset States</button>
          <button @click="gotoLuaRouteDebugScreen">Debug Screen</button>
        </div>
      </div>
      <div class="handle" @click="toggleOpen">
        <div class="heading-wrapper">
          <span class="label">
            <strong>Lua Router</strong>
          </span>
          <a @click="closeDebug">x</a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import { useBridge } from "@/bridge"
import { Lua } from "@/bridge/libs"

const { events } = useBridge()

const showDebug = ref(true)
const isOpen = ref(false)
const currentRoute = ref(null)
const navigationState = ref(null)

onMounted(async () => {
  events.on("ui_router_navigationStateResponse", onNavigationStateResponse)
  events.on("ui_router_afterRouteChange", onRouteChangeSuccess)
  currentRoute.value = await Lua.extensions.ui_router.getCurrent()
  // await Lua.extensions.ui_router.requestNavigationState()
})

onBeforeUnmount(() => {
  events.off("ui_router_navigationStateResponse", onNavigationStateResponse)
  events.off("ui_router_afterRouteChange", onRouteChangeSuccess)
})

function toggleOpen() {
  isOpen.value = !isOpen.value
}

async function onRouteChangeSuccess(data) {
  // console.log("onRouteChangeSuccess", data)
  currentRoute.value = data
  onNavigationStateResponse(await Lua.extensions.ui_router.getState())
  // await Lua.extensions.ui_router.requestNavigationState()
}

function onNavigationStateResponse(data) {
  // console.log("onNavigationStateResponse", data)
  navigationState.value = data
}

function gotoLuaRouteDebugScreen() {
  window.bngVue.gotoGameStateOriginal("luaRouteDebugScreen")
}
</script>

<style lang="scss" scoped>
#lua-router-debug {
  position: absolute;
  display: flex;
  background: green;
  color: white;
  left: 0;
  top: 50%;
  font-size: 10pt;
  border-radius: var(--bng-corners-2);
  z-index: var(--zorder_index_mdcontent) !important;
  box-sizing: border-box;
}

.handle {
  height: 20rem;
  width: 1.5rem;
  padding: 0.5rem 0.25rem;
  cursor: pointer;
  overflow: hidden;
  box-sizing: border-box;
}

.heading-wrapper {
  width: 19rem;
  transform-origin: 0 0;
  transform: rotate(90deg) translateY(-100%);
  display: flex;
}

.main {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: stretch;
  height: 20rem;
  padding: 1em 0.5em;
  box-sizing: border-box;
  background-color: #000d;
  overflow-x: auto hidden;
}
</style>
