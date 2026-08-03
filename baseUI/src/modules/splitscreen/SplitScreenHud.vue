<template>
  <div v-show="panelCount > 0" class="splitscreen-hud">
    <div v-for="(p, i) in panels" :key="i" class="splitscreen-hud__cell" :class="{ 'is-focused': p.player === focusedPlayer }" :style="cellStyle(i)" @click="focusView(p)">
      <!-- default HUD -->
      <div v-if="p.mode === 'hud'" class="splitscreen-hud__panel">
        <div class="splitscreen-hud__player">P{{ i + 1 }}</div>
        <div v-if="p.device" class="splitscreen-hud__device">{{ p.device }}</div>
        <div class="splitscreen-hud__speed">
          <span class="splitscreen-hud__speed-val">{{ p.speed }}</span>
          <span class="splitscreen-hud__speed-unit">km/h</span>
        </div>
        <div class="splitscreen-hud__row">
          <span class="splitscreen-hud__gear">{{ p.gear }}</span>
          <span class="splitscreen-hud__rpm">{{ p.rpm }} rpm</span>
        </div>
      </div>

      <!-- this player's menu / mini car selector (own focus, only their inputs) -->
      <div v-else class="splitscreen-hud__menu">
        <div class="splitscreen-hud__menu-head">P{{ i + 1 }} &middot; {{ headFor(p) }}</div>

        <div v-if="p.mode === 'menu'" class="splitscreen-hud__list">
          <div
            v-for="(item, idx) in MENU_ITEMS"
            :key="idx"
            class="splitscreen-hud__item"
            :class="{ 'is-selected': idx === p.sel }"
          >
            {{ item }}
          </div>
        </div>

        <!-- thumbnail filmstrip: models (page 1) then that model's configs (page 2), like the real selector -->
        <div v-else-if="p.mode === 'models' || p.mode === 'configs'" class="splitscreen-hud__selector">
          <div class="splitscreen-hud__strip">
            <div class="splitscreen-hud__strip-track" :style="stripStyle(p)">
              <div
                v-for="(item, idx) in listFor(p)"
                :key="idx"
                class="splitscreen-hud__thumb"
                :class="{ 'is-selected': idx === p.sel }"
              >
                <img v-if="item.preview" :src="item.preview" class="splitscreen-hud__thumb-img" loading="lazy" />
                <div v-else class="splitscreen-hud__thumb-img splitscreen-hud__thumb-noimg" />
              </div>
            </div>
          </div>
          <div class="splitscreen-hud__carsel-count">{{ currentCarName(p) }} &middot; {{ p.sel + 1 }} / {{ listFor(p).length }}</div>
        </div>

        <!-- change car: live switch between already-spawned free cars -->
        <div v-else class="splitscreen-hud__carsel">
          <div class="splitscreen-hud__carsel-name">&#9664; {{ currentCarName(p) }} &#9654;</div>
          <div v-if="listFor(p).length" class="splitscreen-hud__carsel-count">{{ p.sel + 1 }} / {{ listFor(p).length }}</div>
        </div>

        <div class="splitscreen-hud__hint">Up/Down &middot; OK &middot; Back</div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from "vue"
import { useBridge } from "@/bridge"
import { useEvents } from "@/services/events"

defineOptions({ name: "SplitScreenHud" })

const MAX_PANELS = 8
const STREAMS = ["electrics"]
const MENU_ITEMS = ["Change car", "Replace car", "Reset vehicle", "Exit split screen", "Resume"]

const bridge = useBridge()
const events = useEvents()

const panelCount = ref(0)
const panels = reactive([]) // per player: { speed, gear, rpm, mode: hud|menu|cars|models, sel, cars, origId }
const vehicleChoices = ref([]) // shared vehicle model catalog for "Replace car"

// per-view rects (fractions of the window) sent by splitScreen.lua: the single layout source
const layout = ref([])
function cellStyle(i) {
  const r = layout.value[i]
  if (!r) return { display: "none" }
  return { left: r[0] * 100 + "%", top: r[1] * 100 + "%", width: r[2] * 100 + "%", height: r[3] * 100 + "%" }
}

// keyboard+mouse host clicks a view to take control of that player
const focusedPlayer = ref(null)
function focusView(p) {
  focusedPlayer.value = p.player
  bridge.api.engineLua(`extensions.render_splitScreen.focusView(${p.player})`)
}

const blankPanel = () => ({ speed: "0", gear: "\u2014", rpm: "0", mode: "hud", sel: 0, cars: [], configs: [], model: null, origId: null, player: 0, device: "" })

function onStreams(streams) {
  const byPlayer = streams && streams.players
  for (let i = 0; i < panels.length; ++i) {
    const pid = panels[i].player
    const e = byPlayer && byPlayer[pid] && byPlayer[pid].electrics
    if (!e) continue
    panels[i].speed = String(Math.round(Math.abs((e.wheelspeed || 0) * 3.6)))
    panels[i].gear = (e.gear !== undefined && e.gear !== null) ? String(e.gear) : "\u2014"
    panels[i].rpm = String(Math.round(e.rpm || 0))
  }
}

// --- per-player menu navigation (own virtual focus, no DOM focus) ---
const listFor = p => (p.mode === "cars" ? p.cars : p.mode === "models" ? vehicleChoices.value : p.mode === "configs" ? p.configs : MENU_ITEMS)
const currentCarName = p => { const it = listFor(p)[p.sel]; return (it && it.name) || "?" }
const headFor = p => (p.mode === "cars" ? "Change car" : p.mode === "models" ? "Replace car" : p.mode === "configs" ? "Choose config" : "Menu")
// filmstrip: slide the track so the selected thumbnail is centered (TILE_W = thumb width incl. margins, in em)
const TILE_W = 7
const stripStyle = p => ({ transform: `translate(calc(-${(p.sel + 0.5) * TILE_W}em), -50%)` })

// open the free-car switcher for this player; the backend lists only unused cars
function openCars(p, player) {
  bridge.api.engineLua(`extensions.render_splitScreen.getFreeCars(${player})`, res => {
    const cars = (res && Array.isArray(res.cars)) ? res.cars : []
    p.cars = cars
    p.origId = (res && res.currentId != null) ? res.currentId : null
    const idx = cars.findIndex(c => c.id === p.origId)
    p.sel = idx >= 0 ? idx : 0
    p.mode = "cars"
  })
}

const applyCar = (p, player) => { const c = p.cars[p.sel]; if (c) bridge.api.engineLua(`extensions.render_splitScreen.switchCar(${player}, ${c.id})`) }
const revertCar = (p, player) => { if (p.origId != null) bridge.api.engineLua(`extensions.render_splitScreen.switchCar(${player}, ${p.origId})`) }

function activate(p, player) {
  if (p.mode === "menu") {
    const item = MENU_ITEMS[p.sel]
    if (item === "Change car") openCars(p, player)
    else if (item === "Replace car") { p.sel = 0; p.mode = "models" }
    else if (item === "Reset vehicle") { bridge.api.engineLua(`extensions.render_splitScreen.resetVehicle(${player})`); p.mode = "hud"; p.sel = 0 }
    else if (item === "Exit split screen") { bridge.api.engineLua('extensions.unload("render_splitScreen")') } // turns split-screen off for everyone
    else { p.mode = "hud"; p.sel = 0 } // Resume
  } else if (p.mode === "cars") {
    p.mode = "hud"; p.sel = 0 // OK keeps the car they're already seated in
  } else if (p.mode === "models") {
    const choice = vehicleChoices.value[p.sel]
    if (!choice) return
    p.model = choice.model // page 2: that model's configs
    bridge.api.engineLua(`extensions.render_splitScreen.getModelConfigs('${choice.model}')`, list => {
      p.configs = Array.isArray(list) ? list : []
      const def = p.configs.findIndex(c => c.default)
      p.sel = def >= 0 ? def : 0
      p.mode = "configs"
    })
  } else if (p.mode === "configs") {
    const c = p.configs[p.sel]
    if (c) bridge.api.engineLua(`extensions.render_splitScreen.selectVehicle(${player}, '${p.model}', '${c.config}')`) // replace with model + config
    p.mode = "hud"; p.sel = 0
  }
}

// fired by render_splitScreen.nav(player, action) -> only the matching panel reacts
function handleNav(action, player) {
  const p = panels.find(pp => pp.player === player)
  if (!p) return
  if (p.mode === "hud") {
    if (action === "menu") { p.mode = "menu"; p.sel = 0 }
  } else if (action === "menu" || action === "back") {
    if (p.mode === "cars") { revertCar(p, player); p.mode = "menu"; p.sel = 0 } // Back reverts the live car
    else if (p.mode === "configs") { p.mode = "models"; p.sel = 0 } // back to the model grid
    else if (p.mode === "models") { p.mode = "menu"; p.sel = 0 } // nothing applied until OK
    else { p.mode = "hud"; p.sel = 0 }
  } else {
    const n = listFor(p).length || 1
    if (action === "up" || action === "down") {
      p.sel = action === "up" ? (p.sel - 1 + n) % n : (p.sel + 1) % n
      if (p.mode === "cars") applyCar(p, player) // re-seat live while browsing free cars
    } else if (action === "ok") {
      activate(p, player)
    }
  }
}

events.on("splitScreenNav", handleNav)

// --- streams subscription, gated on split being active ---
let subscribed = false
function setSubscribed(on) {
  if (on === subscribed) return
  subscribed = on
  if (on) {
    bridge.streams.add(STREAMS)
    bridge.events.on("onStreamsUpdate", onStreams)
  } else {
    bridge.events.off("onStreamsUpdate", onStreams)
    bridge.streams.remove(STREAMS)
  }
}

// driven by splitScreen.lua: number of active players (0 = off)
function setCount(n, rects, players) {
  n = Math.max(0, Math.min(MAX_PANELS, Number(n) || 0))
  layout.value = Array.isArray(rects) ? rects : []
  const infos = Array.isArray(players) ? players : []
  panelCount.value = n
  panels.length = 0
  for (let i = 0; i < n; ++i) {
    const p = blankPanel()
    p.player = infos[i] ? infos[i].player : i
    p.device = infos[i] ? infos[i].device : ""
    panels.push(p)
  }
  if (n > 0) {
    bridge.streams.setActivePlayers(panels.map(p => p.player))
    setSubscribed(true)
    if (!vehicleChoices.value.length) {
      bridge.api.engineLua("extensions.render_splitScreen.getVehicleChoices()", list => {
        vehicleChoices.value = Array.isArray(list) ? list : []
      })
    }
  } else {
    setSubscribed(false)
    bridge.streams.setActivePlayers([0])
  }
}

events.on("splitScreenPlayers", setCount)

onUnmounted(() => {
  setSubscribed(false)
  bridge.streams.setActivePlayers([0])
})
</script>

<style lang="scss" scoped>
.splitscreen-hud {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;

  &__cell {
    position: absolute;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: var(--safezone);
    min-width: 0;
    min-height: 0;
    pointer-events: auto; // host can click a view to control it with keyboard/mouse
    cursor: pointer;

    &:hover {
      box-shadow: inset 0 0 0 2px rgba(var(--bng-off-white-rgb), 0.35);
    }

    &.is-focused {
      box-shadow: inset 0 0 0 3px var(--bng-orange-600);
    }
  }

  &__panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15em;
    padding: 0.5em 1em;
    border-radius: var(--bng-corners-2);
    background: rgba(0, 0, 0, 0.55);
    color: var(--bng-off-white);
    font-family: var(--fnt-defs);
    line-height: 1;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  &__player {
    font-size: 0.75em;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--bng-ter-blue-gray-300);
  }

  &__device {
    font-size: 0.65em;
    max-width: 12em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.7;
  }

  &__speed {
    display: flex;
    align-items: baseline;
    gap: 0.2em;
  }

  &__speed-val {
    font-size: 2em;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__speed-unit {
    font-size: 0.7em;
    opacity: 0.7;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 0.75em;
    font-size: 0.8em;
    font-variant-numeric: tabular-nums;
  }

  &__gear {
    font-weight: 700;
  }

  &__rpm {
    opacity: 0.7;
  }

  // per-player menu overlay: fills that player's region only
  &__menu {
    align-self: stretch;
    justify-self: stretch;
    flex: 1 1 auto;
    margin: var(--safezone);
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    padding: 1em;
    border-radius: var(--bng-corners-2);
    background: rgba(0, 0, 0, 0.78);
    color: var(--bng-off-white);
    font-family: var(--fnt-defs);
    overflow: hidden;
  }

  &__menu-head {
    font-size: 0.9em;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--bng-ter-blue-gray-300);
    text-transform: uppercase;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    flex: 1 1 auto;
    min-height: 0;
  }

  &__item {
    padding: 0.35em 0.6em;
    border-radius: var(--bng-corners-1);
    font-size: 1.1em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.7;

    &.is-selected {
      background: var(--bng-orange-600);
      color: var(--bng-black);
      opacity: 1;
    }
  }

  &__carsel {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25em;
    flex: 1 1 auto;
    min-height: 0;
  }

  &__carsel-name {
    font-size: 1.4em;
    font-weight: 700;
    text-align: center;
    color: var(--bng-orange-100);
  }

  &__carsel-count {
    font-size: 0.8em;
    opacity: 0.7;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  // thumbnail filmstrip (model / config selector)
  &__selector {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    align-items: stretch;
  }

  &__strip {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }

  &__strip-track {
    position: absolute;
    top: 50%;
    left: 50%;
    display: flex;
    align-items: center;
    transition: transform 0.12s ease-out;
  }

  &__thumb {
    width: 6em;
    margin: 0 0.5em; // 6 + 2*0.5 = 7em = TILE_W in the script
    flex: 0 0 auto;
    opacity: 0.45;
    transform: scale(0.82);
    transition: transform 0.12s ease-out, opacity 0.12s ease-out;

    &.is-selected {
      opacity: 1;
      transform: scale(1);
    }
  }

  &__thumb-img {
    display: block;
    width: 100%;
    height: 4em;
    object-fit: contain;
    border-radius: var(--bng-corners-1);
    background: rgba(0, 0, 0, 0.4);
  }

  &__thumb.is-selected &__thumb-img {
    box-shadow: 0 0 0 2px var(--bng-orange-600);
  }

  &__thumb-noimg {
    background: rgba(var(--bng-off-white-rgb), 0.12);
  }

  &__hint {
    font-size: 0.7em;
    opacity: 0.55;
  }
}
</style>
