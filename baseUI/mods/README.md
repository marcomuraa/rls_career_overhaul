# Vue UI Mods

UI mods use regular Vue Single File Components with full Vue and SCSS support.
They can use built-in UI components, local modules, composables, and the Lua bridge.

Mods live in:

`/ui/ui-vue/mods/%mod_name%/`

See `Anna's Toolbox` mod for a complete example.

## Quick start

Create a `.vue` file in your mod folder:

```vue
<template>
  <div class="my-panel">
    <BngButton @click="count++">Clicked {{ count }} times</BngButton>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton } from "@/common/components/base"

const count = ref(0)
</script>

<style lang="scss" scoped>
.my-panel {
  display: flex;

  > * {
    flex: 1;
  }
}
</style>
```

Use normal Vue Composition API and SFC features. Components can import:

- Vue APIs from `"vue"`
- Built-in UI code through `"@/..."`
- Local `.vue`, `.js`, `.mjs`, `.json`, style, and asset files

## UI slots

Slots mount a component at a predefined UI location.
Add `modInfo` in a normal `<script>` block:

```vue
<script>
const modInfo = {
  uiSlots: ["mainmenu.top"],
}
</script>
```

Available slots are defined in:
`ui/ui-vue/src/services/modManager/slots.js`

## Entry point

A root `index.js` can register behaviour without mounting a component.
Export `onLoad` and `onUnload`; both may be async.

```js
import { useBridge } from "@/bridge"

const { events } = useBridge()

function addMyButton(addButton) {
  addButton({
    title: "My Mod",
    iconId: "wrench",
    action: () => console.log("clicked"),
  })
}

export function onLoad() {
  events.on("MainMenuButtons", addMyButton)
}

export function onUnload() {
  events.off("MainMenuButtons", addMyButton)
}
```

Keep top-level code free of side effects. The runtime calls `onUnload` before a
reload and then evaluates the module again before calling `onLoad`.

## Pause menu

Vue-only mods can register pause tabs and rail buttons through the Lua bridge:

- `registerModTab(tab)` / `unregisterModTab(id)`
- `registerModButton(button)` / `unregisterModButton(id)`

Add a button to the shared `"mods"` tab:

```js
import { lua } from "@/bridge"

await lua.extensions.ui_pause_actions.registerModButton({
  id: "my-mod-button",
  tabId: "mods",
  label: "My Mod",
  icon: "wrench",
  componentName: "/ui/ui-vue/mods/%mod_name%/MyCard.vue",
})
```

For a dedicated tab, register the tab first, then its buttons:

```js
await lua.extensions.ui_pause_actions.registerModTab({
  id: "my-tab",
  label: "My Tab",
  icon: "wrench",
  card2ComponentName: "/ui/ui-vue/mods/%mod_name%/SideCard.vue",
})

await lua.extensions.ui_pause_actions.registerModButton({
  id: "my-tab-home",
  tabId: "my-tab",
  label: "Home",
  componentName: "/ui/ui-vue/mods/%mod_name%/MainCard.vue",
})
```

Use dedicated tabs sparingly; prefer the shared Mods tab for small contributions.

Button fields:

- `componentName` and `props` configure card 1
- `card2ComponentName` and `card2Props` configure card 2

Tab and button IDs are global. Registering an existing ID replaces it. Moving a
button ID to another tab removes it from the old tab. Unregistering a tab also
unregisters its buttons.

The shared `"mods"` tab only appears while it has buttons.

## Standalone routes

Routes are registered twice: Vue receives the component, while Lua receives the
navigable route configuration.

```js
import { useBridge } from "@/bridge"
import MyScreen from "./MyScreen.vue"

const { lua } = useBridge()
const sourceId = "my-mod.routes"
const routes = [
  {
    path: "/my-mod",
    name: "menu.myMod",
    component: MyScreen,
    meta: {
      luaRoute: {
        title: "My Mod",
        backTarget: "menu",
      },
    },
  },
]

function toLuaRoutes(records) {
  return records.map(record => ({
    name: record.name,
    path: record.path,
    meta: record.meta,
    ...(record.children ? { children: toLuaRoutes(record.children) } : {}),
  }))
}

export async function onLoad() {
  window.bngRoutes.add([{ path: sourceId, routes }])
  const result = await lua.extensions.ui_router_routeManager.registerModRoutes(
    sourceId,
    toLuaRoutes(routes),
  )

  if (!result?.success) {
    window.bngRoutes.remove([sourceId])
    console.error("Failed to register mod routes", result?.errors)
  }
}

export async function onUnload() {
  window.bngRoutes.remove([sourceId])
  await lua.extensions.ui_router_routeManager.unregisterModRoutes(
    sourceId,
    { fallbackRoute: "menu" },
  )
}
```

Keep `sourceId` globally unique and stable. Add Vue routes before Lua routes;
remove them in the same order. Re-registering a source replaces its routes, and
the newest source wins when routes overlap.

Common UI fields (`infoBar`, `topBar`, `uiApps`, `uiTypes`, `uiTypesFilter`) go
directly in `meta`. Lua-only fields such as `title`, `backTarget`, `scopeTree`,
and lifecycle hooks go in `meta.luaRoute`. Lifecycle hooks use
`"moduleName.functionName"` strings.

Use `fallbackRoute` when unregistering in case the removed route is active.
See `RuntimeRouteTest` for nested routes and overriding existing routes.

## Reloading and errors

- Use the Mods panel in the Vue debug overlay to reload one mod or all mods.
- File changes are detected automatically during development.
- Compile and runtime errors appear in the UI and DevTools console.

## Runtime overview

1. `uiMods.lua` discovers files under `/ui/ui-vue/mods/`.
2. `modManager` tracks mods, slots, entry points, and reloads.
3. The runtime compiles Vue SFCs and their imports.
4. `ModSlot` and pause menu registrations mount compiled components.
