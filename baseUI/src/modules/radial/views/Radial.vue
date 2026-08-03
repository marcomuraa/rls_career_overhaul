<template>
  <LayoutSingle class="radial-menu-layout" :blur="!temporaryHidden">
    <div
      class="radial-menu"
      :class="{ temporaryHidden }"
      v-bng-scoped-nav="{ scopeId: 'radial-menu', type: SCOPED_NAV_TYPES.nonav, activateOnMount: true, canDeactivate: canDeactivateScope }"
      v-bng-on-ui-nav:context="openFavoriteSelector"
      v-bng-on-ui-nav:menu,back="back"
      v-bng-on-ui-nav:tab_l,tab_r="processTabInput"
      v-bng-on-ui-nav:focus_lr,focus_ud="processStickInput"
      v-bng-on-ui-nav:focus_l,focus_r,focus_u,focus_d.down="processDpadInput"
      v-bng-on-ui-nav:focus_l,focus_r,focus_u,focus_d.up="processDpadInput"
      v-bng-on-ui-nav:ok,context="processMouseClick"
      @deactivate="close"
      @mousedown="handleMouseDown"

      v-bng-ui-nav-label:menu,back="radialData.backButtonIndex ? 'ui.common.back' : 'ui.common.close'"
      v-bng-ui-nav-label:focus_lr,focus_ud,focus_l,focus_r,focus_u,focus_d="'Radial menu navigation'"
      v-bng-ui-nav-label:ok="'Select'"
      v-bng-ui-nav-label:context="'Configure Slot'"
      v-bng-ui-nav-label:tab_l,tab_r="'Switch Category'"
    >
      <div class="radial-messages">
        <component :is="topLeftApps" />
      </div>
      <div class="radial-infos">
        <BngCardHeading class="radial-title">
          {{ headingTitle }}
        </BngCardHeading>
        <div class="radial-breadcrumbs">{{ breadcrumbs }}</div>
        <div v-if="hasCategories" class="radial-categories">
          <BngBinding
            class="radial-plate radial-tab-left"
            ui-event="tab_l"
            :style="{ '--rad-tab-icon': `'${icons.arrowSmallLeft.glyph}'` }"
            controller
            @click="switchCategory(true)"
          />
          <div class="radial-plate">
            <BngImageTile v-for="category in radialData.categories"
              :key="category.id"
              @click="setLevel(category.goto)"
              tabindex="0" bng-nav-item v-bng-on-ui-nav:ok.asMouse.focusRequired
              class="radial-category"
              :class="{ selected: category.id === radialData.selectedCategory }"
              :icon="icons[category.icon || 'beamNG']"
            >
              <div class="radial-category-label">{{ $translate.instant(category.title) }}</div>
            </BngImageTile>
            <div class="background-plate"></div>
          </div>
          <BngBinding
            class="radial-plate radial-tab-right"
            ui-event="tab_r"
            controller
            :style="{ '--rad-tab-icon': `'${icons.arrowSmallRight.glyph}'` }"
            @click="switchCategory(false)"
          />
        </div>
      </div>
      <div v-if="hasLRShoulderButtons" class="radial-quick-tabs">
        <BngBinding
          class="radial-plate radial-tab-left"
          :style="{ '--rad-tab-icon': `'${icons.arrowSmallLeft.glyph}'` }"
          ui-event="tab_l"
          controller
          @click="LRAction('tab_l')"
        />
        <BngBinding
          class="radial-plate radial-tab-right"
          :style="{ '--rad-tab-icon': `'${icons.arrowSmallRight.glyph}'` }"
          ui-event="tab_r"
          controller
          @click="LRAction('tab_r')"
        />
      </div>
      <div ref="radialCont" class="radial-svg"></div>
      <canvas ref="centerCanvas" class="radial-center-canvas" aria-hidden="true"></canvas>

      <div v-if="focusedItem?.desc" class="radial-description">
        {{$content.bbcode.parse($translate.contextTranslate(focusedItem.desc, true))}}
      </div>
    </div>
  </LayoutSingle>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { BngBinding, BngImageTile, icons } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavLabel, vBngScopedNav } from "@/common/directives"
import { lua } from "@/bridge"
import { useEvents } from "@/services/events"
import { SCOPED_NAV_TYPES } from "@/services/scopedNav/constants"
import RadialSVG from "../radialsvg"
import RadialCenterCanvas from "../radialCenterCanvas"
import useControls from "@/services/controls"
import { $translate, $content } from "@/services"
import BngCardHeading from "@/common/components/base/bngCardHeading.vue"
import { topLeftApps } from "@/modules/apps"
import { LayoutSingle } from "@/common/layouts"

const controls = useControls()
const events = useEvents()

const sensivity = 0.5 // gamepad stick threshold

const radialData = ref({})
const temporaryHidden = ref(false)

const breadcrumbs = computed(() =>
  radialData.value && radialData.value.breadcrumbs && Array.isArray(radialData.value.breadcrumbs)
    ? radialData.value.breadcrumbs.map(str => $translate.instant(str)).join(" / ") : ""
)

const focusedItem = computed(() => {
  let items = radialData?.value?.items
  if (!items) return null
  if (Array.isArray(items)) {
    return items.find(item => item.focused)
  }
  return null
})

const hasLRShoulderButtons = computed(() => {
  return radialData.value && radialData.value.hasLRShoulderButtons
})

const radialCont = ref()
const centerCanvas = ref()
const radialCenterCanvas = new RadialCenterCanvas()

const getHotkey = (action, separator = "") => {
  const viewerObj = controls.makeViewerObj({ action })
  if (viewerObj) {
    return icons[viewerObj.icon].glyph
      + " "
      + viewerObj.control.split(/[ -]/).map(s => s.substring(0, 1).toUpperCase() + s.substring(1)).join(separator)
  } else {
    return ""
  }
}

const getCenterLabel = item => {
  return typeof item.title === "string"
    ? $translate.contextTranslate({ txt: item.title, context: item.context })
    : $translate.contextTranslate(item.title)
}

const getCenterPrice = item => {
  return item?.price?.money?.amount !== undefined ? item.price.money.amount + " \u{EC0D}" : ""
}

const getDefaultCenterState = () => ({
  icon: radialData.value.menuIcon || "beamNG",
  label: $translate.instant("ui.radialmenu2.selectOption"),
  price: "",
  hotkey: getHotkey("menu_item_focus_ud", "+"),
  focused: false,
  color: null,
})

const setCenterDefault = () => {
  radialCenterCanvas.setState(getDefaultCenterState())
}

const setCenterFocus = item => {
  radialCenterCanvas.setState({
    icon: item.icon || radialData.value.menuIcon || "beamNG",
    label: getCenterLabel(item),
    price: getCenterPrice(item),
    hotkey: item.hotkey || "",
    focused: true,
    color: item.color || null,
  })
}

const radialSvg = new RadialSVG({
  click: (item, index) => {
    lua.ui_audio.playEventSound("bng_click_hover_generic", "click");
    //console.log("click", item, index);
    lua.core_quickAccess.selectItem(index + 1, true, 1)
  },
  down: (item, index) => { lua.ui_audio.playEventSound("bng_click_hover_generic", "click"); lua.core_quickAccess.selectItem(index + 1, true, 1) },
  focus: () => { lua.ui_audio.playEventSound("bng_click_hover_generic", "focus") },
  centerFocus: setCenterFocus,
  centerBlur: setCenterDefault,
  contextAction: (item, index) => { lua.ui_audio.playEventSound("bng_click_hover_generic", "focus"); lua.core_quickAccess.contextAction(index + 1, true, 1) },
  //blur: (item, index) => console.log("blur", item, index),
})
let closeRequested = false

const requestData = async () => {
  radialData.value = await lua.core_quickAccess.getUiData()
  const items = Array.isArray(radialData.value.items) ? radialData.value.items : []
  // resolve hotkeys
  for (const item of items) {
    item.hotkey = getHotkey(item.action)
  }
  const menuIcon = radialData.value.menuIcon || "beamNG"
  radialSvg.setMenuIcon(menuIcon)
  setCenterDefault()
  radialSvg.update(items)
  const focusedCenterItem = items.find(item => item.focused)
  if (focusedCenterItem) setCenterFocus(focusedCenterItem)
}

const setLevel = level => {
  lua.ui_audio.playEventSound("bng_click_hover_generic", "focus")
  lua.core_quickAccess.setEnabled(true, level, false)
}

const close = () => {
  if (closeRequested) return
  closeRequested = true
  console.log("[devmode only: remove after finding issue] radial menu: calling lua.core_quickAccess.setEnabled(false, '', false)")
  lua.core_quickAccess.setEnabled(false, "", false)
}

const back = () => {
  console.log("[devmode only: remove after finding issue] radial menu: calling lua.extensions.ui_router.back()")
  lua.extensions.ui_router.back()
}

const canDeactivateScope = () => false

const switchCategory = left => {
  const indexOffset = left ? -1 : 1
  for (let i = 0; i < radialData.value.categories.length; i++) {
    let level = radialData.value.categories[i]
    if (level.id === radialData.value.selectedCategory) {
      let newIndex = (i + indexOffset) % (radialData.value.categories.length)
      if (newIndex < 0) {
        newIndex += (radialData.value.categories.length);
      }
      setLevel(radialData.value.categories[newIndex].goto)
      lua.ui_audio.playEventSound("bng_click_hover_generic", "focus")
      return
    }
  }
}

const LRAction = (evt) => {
  const actions = radialData.value.items

for(let i = 0; i < actions.length; i++) {
  const action = actions[i]
  if(action.isRTabAction && evt === "tab_r") {
    lua.core_quickAccess.selectItem(i + 1, true, 1)
  }
  if(action.isLTabAction && evt === "tab_l") {
    lua.core_quickAccess.selectItem(i + 1, true, 1)
  }
}
}

const processTabInput = evt => {
  //switch category only if there are categories
  if(radialData.value.categories.length > 0) {
    switchCategory(evt.detail.name === "tab_l")
    return
  }
  //if not categories, check all actions if there is a isRTabAction or isLTabAction
  LRAction(evt.detail.name)

}

const processMouseClick = (evt) => {
  if (!radialSvg.buttons) return
  // here we use internal _focused flag because original might be overridden by data
  const elm = radialSvg?.buttons?.find(elm => elm._focused) || radialSvg?.buttons?.find(elm => elm.item.focused)
  if (evt.detail.name === "context") {
    elm && elm.contextMenu(evt)
  } else {
    elm && elm.click(evt)
  }
  return elm
}

const isStickActive = (x, y) => Math.sqrt(x ** 2 + y ** 2) > sensivity

const pointToItem = (x, y) => {
  if (!radialSvg.buttons) return
  const len = radialSvg.buttons.length

  let idx = -1

  // Update pointer visualization
  radialSvg.setPointer(x, y)

  // find focused item
  if (x !== 0 || y !== 0) {
    const cursorPos = 0.5 - Math.atan2(y, x) / Math.PI / 2 // CW pos from left side
    for (let i = 0; i < len; i++) {
      const btn = radialSvg.buttons[i].item
      const halfsize = btn.size / 2
      const startPos = ((btn.position - halfsize) % 1 + 1) % 1
      const endPos = ((btn.position + halfsize) % 1 + 1) % 1

      if (startPos < endPos) {
        if (cursorPos >= startPos && cursorPos < endPos) {
          idx = i
          break
        }
      } else if (cursorPos >= startPos || cursorPos < endPos) {
        idx = i
        break
      }
    }
  }

  // drop focus from non-focused items
  for (let i = 0; i < len; i++) {
    if (i !== idx) radialSvg.buttons[i].blur()
  }
  // focus on found item
  if (idx > -1 && idx < len) {
    radialSvg.buttons[idx].focus()
  }
}

let stickX = 0, stickY = 0
let stickActive = false
const processStickInput = evt => {
  if (evt.detail.name === "focus_ud") {
    stickY = evt.detail.value
  } else {
    stickX = evt.detail.value
  }

  let stickActiveBefore = stickActive
  stickActive = isStickActive(stickX, stickY)

  if (stickActive) {
    pointToItem(stickX, stickY)
  }

  if (!stickActive && stickActiveBefore) {
    pointToItem(0, 0)
  }
}

let dpadX = 0, dpadY = 0
const processDpadInput = evt => {
  switch (evt.detail.name) {
    case "focus_l":
      dpadX = -evt.detail.value
      break
    case "focus_r":
      dpadX = evt.detail.value
      break
    case "focus_u":
      dpadY = evt.detail.value
      break
    case "focus_d":
      dpadY = -evt.detail.value
      break
  }
  (dpadX = 0 + +dpadX), (dpadY = 0 + +dpadY) // normalize negative zero
  pointToItem(dpadX, dpadY)
}

const openFavoriteSelector = () => {
  if (radialData.value.pathBeforeCategory !== "favorites") return
  for (let i = 0; i < radialData.value.items.length; i++) {
    let item = radialData.value.items[i]
    if (item.focused) {
      //lua.core_quickAccess.openFavoriteSelection(i + 1)
      return
    }
  }
}

const handleMouseDown = (event) => {
  const isOnComponents = event.target.closest('.radial-categories, .radial-svg, .radial-tab-left, .radial-tab-right')

  // Only process if it's a real mouse event, not a touch event
  if (event.isTrusted && event.sourceCapabilities?.firesTouchEvents === false && !isOnComponents) {
    if (event.button === 0) { // Left click
      close()
    } else if (event.button === 2) { // Right click
      back()
    }
  }
}

events.on("radialMenuUpdated", requestData)
events.on("RadialTemporaryHide", hide => {
  temporaryHidden.value = hide
})

onMounted(() => {
  radialSvg.create(radialCont.value)
  radialCenterCanvas.create(centerCanvas.value)
  setCenterDefault()
  requestData()
})

onUnmounted(() => {
  radialCenterCanvas.dispose()
  radialSvg.dispose()
})

const headingTitle = computed(() => {
  if (radialData.value?.breadcrumbs?.[0]) {
    return $translate.instant(radialData.value.breadcrumbs[0])
  }
  return radialData.value?.items?.length ? $translate.instant("ui.radialmenu2.radialMenu") : $translate.instant("ui.radialmenu2.noActionsAvailable")
})

const hasCategories = computed(() => {
  return radialData.value?.categories &&
         (Array.isArray(radialData.value.categories) ?
          radialData.value.categories.length > 0 :
          Object.keys(radialData.value.categories).length > 0)
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

$z-index-base: var(--z-index-override, 1);

.radial-menu-layout {
  --content-flow: column;
  --bng-bg-enabled: var(--bng-off-black);
  --bng-bg-enabled-opacity: 0.4;
}

.radial-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 0 auto;
  height: 100%;
  color: var(--bng-off-white);
  --bng-icon-color: var(--bng-off-white);
  // Change this one value to manually probe full radial menu scaling.
  --radial-menu-size: 450px;
  --radial-menu-radius: calc(var(--radial-menu-size) / 2);
  --radial-menu-center-y: 55%;
  padding: 2em 0;
  &.temporaryHidden {
    opacity: 0.5;
  }
}

.radial-svg,
.radial-center-canvas {
  display: block;
  width: var(--radial-menu-size);
  min-width: var(--radial-menu-size);
  height: var(--radial-menu-size);
  position: absolute;
  top: calc(var(--radial-menu-center-y) - var(--radial-menu-radius));
  margin: auto;
}

.radial-center-canvas {
  pointer-events: none;
}

.radial-quick-tabs {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: calc(100% - var(--radial-menu-center-y) - 2em);
  gap: calc(var(--radial-menu-size) + 1em);
  padding-bottom: 1em;
}

.radial-plate {
  padding: 0.25em;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  position: relative;
  @include calculate-z-index($z-index-base, 1, 1);
  .background-plate {
    position: absolute;
    top: 0.8em;
    bottom: 0.8em;
    left: 0;
    right: 0;
    width: 100%;
    background: rgba(var(--bng-cool-gray-800-rgb), 0.5);
    border-radius: var(--bng-corners-2);
    @include calculate-z-index($z-index-base, 1, 1);
  }
  .radial-category {
    @include calculate-z-index($z-index-base, 3, 2);
  }
}

.radial-categories {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  margin: 0.5em 0 0 0;
  font-size: 1.0em;
  font-weight: 500;
  > * {
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    margin: 0 0.25em;
    > * {
      flex: 0 0 auto;
    }
  }


  .radial-category {
    width: 8rem;
    margin: 0.25rem -0.5rem;
    font-size: 1.1em;
    font-weight: 600;
    background-color: #000c;
    transform: scale(0.8);
    transition: margin 200ms, transform 200ms;
    border: 0.15rem solid var(--bng-cool-gray-700);
    padding-bottom: 0.35rem;

    display: flex;
    align-self: stretch;

    &:hover {
      background-color: var(--bng-ter-blue-gray-800);
      border-color: var(--bng-cool-gray-500);
    }

    :deep(.aspect-ratio) {
      .slotted {
        font-size: 0.9em;
        font-weight: inherit;
      }
      &::after {
        padding-bottom: 3.5em;
      }
    }

    &.selected {
      margin-left: 0.25rem;
      margin-right: 0.25rem;
      background-color: var(--bng-ter-blue-gray-700);
      transform: scale(1);
      border: 0.15rem solid var(--bng-cool-gray-500);
      border-bottom: 0.5rem solid var(--bng-orange);
      padding-bottom: 0;
    }

    .radial-category-label {
      padding: 0.5rem 0;
      text-align: center;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--bng-off-white);
    }
  }

}



.radial-tab-left::before,
.radial-tab-right::after {
  content: var(--rad-tab-icon);
  margin-bottom: -0.1em;
  margin-left: -0.1em;
  margin-right: -0.1em;
  font-size: 1.5em;
  font-family: bngIcons;
}
.radial-tab-left::before {
  margin-right: 0;
}
.radial-tab-right::after {
  margin-left: 0;
}

.radial-infos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: calc(100% - var(--radial-menu-center-y) + var(--radial-menu-radius));
  padding-bottom: 1em;
}

.radial-title {
  font-size: 1.8em;
  margin-bottom: -0em;
  text-shadow: 0 0 1em rgba(0, 0, 0, 0.4);
  overflow: visible;
}
.radial-breadcrumbs {
  font-size: 1.2em;
  white-space: nowrap;
  //opacity: 0.75;
  font-weight: 300;
  text-shadow: 0 0 0.75em rgba(0, 0, 0, 0.40);
  overflow: visible;
}

.radial-tab-left,
.radial-tab-right {
  cursor: pointer;
  border-radius: var(--bng-corners-2);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.5);

  &:hover {
    background-color: var(--bng-ter-blue-gray-800);
  }
}

.radial-description {
  position: absolute;
  top: calc(var(--radial-menu-center-y) + var(--radial-menu-radius));
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5em 1em;
  margin-top: 1em;
  border-radius: var(--bng-corners-1);
  background-color: #0008;
  text-align: center;
}

.radial-messages {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  width: 25rem;
  max-height: 100vh;
  overflow-y: auto;
}
</style>
