<template>
  <div
    :class="{
      'parts-packs': true,
      'with-background': props.withBackground,
    }"
    v-bng-blur="props.withBackground"
  >
    <div
      class="parts-packs-content"
      v-bng-scoped-nav="props.withScopedNav ? partsPacksScopeConfig : { disabled: true }"
    >
      <div class="parts-packs-header">
        <BngButton
          v-if="currentPath !== '/'"
          :icon="icons.arrowSmallLeft"
          :accent="ACCENTS.outlined"
          class="path-back"
          @click="goUp"
        />
        <div class="path-label">{{ currentPath }}</div>
      </div>

      <div v-if="waitingForData" class="packs-empty">
        {{ $t("ui.common.loading")}}
      </div>
      <div
        v-else-if="!currentNode || (folderList.length === 0 && packList.length === 0)"
        class="packs-empty"
      >
        {{ $t("ui.vehicleconfig.packs.noAvailablePacks") }}
      </div>
      <div v-else class="packs-list">
        <div v-if="folderList.length > 0" class="packs-group">
          <div class="group-title">Folders</div>
          <div v-for="folder in folderList" :key="folder.path" class="folder-item">
            <BngButton
              :accent="ACCENTS.menu"
              class="folder-button"
              @click="goToChild(folder.name)"
            >
              <div class="pack-row">
                <BngIcon
                  :type="folder.icon && icons[folder.icon] ? icons[folder.icon] : icons.BNGFolder"
                  class="pack-icon"
                />
                <div class="pack-info">
                  <div class="pack-title">{{ folder.displayTitle }}</div>
                  <div v-if="folder.description" class="pack-description">{{ folder.description }}</div>
                </div>
              </div>
            </BngButton>
            <BngButton
              :icon="icons.arrowSmallRight"
              :accent="ACCENTS.text"
              class="folder-next"
              @click="goToChild(folder.name)"
            />
          </div>
        </div>

        <div v-if="packList.length > 0" class="packs-group">
          <div class="group-title">Packs</div>
          <BngButton
            v-for="pack in packList"
            :key="pack.name"
            :accent="ACCENTS.menu"
            :class="{
              'pack-item-button': true,
              'pack-selected': isSelected(pack),
              'pack-blink': isBlinking(pack),
            }"
            @mouseenter="highlightPack(pack)"
            @mouseleave="clearPackHighlight"
            @focus="highlightPack(pack)"
            @blur="clearPackHighlight"
            @click="selectPack(pack)"
          >
            <div class="pack-row">
              <BngIcon v-if="pack.icon" :type="icons[pack.icon] || icons.placeholder" class="pack-icon" />
              <div class="pack-info">
                <div class="pack-title">{{ pack.title || pack.name }}</div>
                <div v-if="pack.description" class="pack-description">{{ pack.description }}</div>
              </div>
            </div>
          </BngButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue"
import { useEvents } from "@/services/events"
import { lua } from "@/bridge"
import { vBngBlur, vBngScopedNav } from "@/common/directives"
import { BngButton, BngIcon, ACCENTS, icons } from "@/common/components/base"
import { ExecQueue } from "@/services/queue"

const props = defineProps({
  withBackground: Boolean,
  withScopedNav: {
    type: Boolean,
    default: true,
  },
  canDeactivateScope: {
    type: Function,
    default: undefined,
  },
})

const partsPacksScopeConfig = computed(() => ({
  bubbleWhitelistEvents: ["menu"],
  canDeactivate: typeof props.canDeactivateScope === "function" ? props.canDeactivateScope : undefined,
}))

const events = useEvents()
const queue = new ExecQueue()
const partPacks = ref({})
const waitingForData = ref(true)
const currentTree = ref(null)
const currentPath = ref("/")
const pendingPathRestore = ref(null)
const selectedByPath = reactive({})
const blinkPackName = ref(null)
let blinkTimeoutId = null
const highlightedPackName = ref(null)
const currentVehID = ref(null)

const normalizePartPacks = (packs) => {
  if (!packs) return {}
  const res = {}
  if (Array.isArray(packs)) {
    for (const pack of packs) {
      if (!pack || typeof pack.path !== "string") continue
      const isFolder = pack.path.endsWith("/") && !pack.partPackData
      const normalizedPath = normalizePath(pack.path)
      res[normalizedPath] = {
        ...pack,
        path: normalizedPath,
        name: normalizedPath,
        isFolder,
      }
    }
    return res
  }
  if (typeof packs !== "object") return {}
  for (const [pathKey, pack] of Object.entries(packs)) {
    if (!pack || typeof pack !== "object") continue
    const isFolder = typeof pathKey === "string" && pathKey.endsWith("/") && !pack.partPackData
    const normalizedPath = normalizePath(pathKey)
    res[normalizedPath] = {
      ...pack,
      path: normalizedPath,
      name: normalizedPath,
      isFolder,
    }
  }
  return res
}

const normalizePath = (path) => {
  if (!path || typeof path !== "string") return "/"
  let normalized = path.trim()
  if (normalized === "") return "/"
  if (!normalized.startsWith("/")) normalized = `/${normalized}`
  normalized = normalized.replace(/\/+/g, "/")
  if (normalized.length > 1 && normalized.endsWith("/")) normalized = normalized.slice(0, -1)
  return normalized
}

const splitPath = (path) => normalizePath(path).split("/").filter(Boolean)

const buildTree = (packs) => {
  const root = { name: "", path: "/", children: {}, packs: [] }
  for (const pack of Object.values(packs || {})) {
    const normalizedPath = typeof pack.path === "string" ? normalizePath(pack.path) : "/"
    const segments = splitPath(normalizedPath)
    let node = root
    let current = ""
    if (pack.isFolder) {
      for (const segment of segments) {
        current += `/${segment}`
        if (!node.children[segment]) {
          node.children[segment] = { name: segment, path: current, children: {}, packs: [] }
        }
        node = node.children[segment]
      }
      node.meta = pack
    } else {
      const leafName = segments.pop()
      for (const segment of segments) {
        current += `/${segment}`
        if (!node.children[segment]) {
          node.children[segment] = { name: segment, path: current, children: {}, packs: [] }
        }
        node = node.children[segment]
      }
      if (leafName) {
        pack.name = pack.name || normalizedPath
        node.packs.push(pack)
      }
    }
  }
  return root
}

const tree = computed(() => buildTree(partPacks.value))

const currentNode = computed(() => {
  const segments = splitPath(currentPath.value)
  let node = tree.value
  for (const segment of segments) {
    node = node?.children?.[segment]
    if (!node) return null
  }
  return node
})

const folderList = computed(() => {
  const children = currentNode.value?.children || {}
  return Object.values(children)
    .map(child => ({
      ...child,
      displayTitle: child.meta?.title || child.name,
      icon: child.meta?.icon,
      description: child.meta?.description,
    }))
    .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle))
})

const packList = computed(() => {
  const packs = currentNode.value?.packs || []
  return [...packs].sort((a, b) => {
    const aName = (a.title || a.name || "").toLowerCase()
    const bName = (b.title || b.name || "").toLowerCase()
    return aName.localeCompare(bName)
  })
})

const buildChosenMap = (node, out = {}, nodeKey = null) => {
  if (!node) return out
  const slotName = node.id || nodeKey
  if (slotName) out[slotName] = node.chosenPartName
  if (node.children) {
    for (const [childKey, child] of Object.entries(node.children)) {
      buildChosenMap(child, out, childKey)
    }
  }
  return out
}

const refreshSelectedByPath = () => {
  for (const key of Object.keys(selectedByPath)) {
    delete selectedByPath[key]
  }
  if (!currentTree.value) return
  const chosenMap = buildChosenMap(currentTree.value)
  for (const pack of Object.values(partPacks.value || {})) {
    const parts = pack?.partPackData?.parts
    if (!parts || typeof parts !== "object") continue
    const matches = Object.entries(parts).every(([slot, partName]) => chosenMap[slot] === partName)
    if (matches) {
      selectedByPath[normalizePath(pack.path || "/")] = pack.name
    }
  }
}

const processConfig = (config) => {
  currentVehID.value = config?.vehID ?? null
  partPacks.value = normalizePartPacks(config?.partPacks)
  currentTree.value = config?.chosenPartsTree || null
  waitingForData.value = false
  refreshSelectedByPath()
  const desiredPath = pendingPathRestore.value || currentPath.value
  pendingPathRestore.value = null
  const segments = splitPath(desiredPath)
  let node = tree.value
  for (const segment of segments) {
    node = node?.children?.[segment]
    if (!node) break
  }
  currentPath.value = node ? desiredPath : "/"
}

events.on("VehicleConfigChange", processConfig)

onMounted(() => {
  lua.extensions.core_vehicle_partmgmt.sendDataToUI()
})

const goToChild = (name) => {
  currentPath.value = normalizePath(`${currentPath.value}/${name}`)
}

const goUp = () => {
  const segments = splitPath(currentPath.value)
  segments.pop()
  currentPath.value = segments.length ? `/${segments.join("/")}` : "/"
}

const isSelected = (pack) => selectedByPath[currentPath.value] === pack.name
const isBlinking = (pack) => blinkPackName.value === pack.name

const buildSlotPartPathMap = (node, out = {}, nodeKey = null) => {
  if (!node) return out
  const slotName = node.id || nodeKey
  if (slotName && node.partPath) out[slotName] = node.partPath
  if (node.children) {
    for (const [childKey, child] of Object.entries(node.children)) {
      buildSlotPartPathMap(child, out, childKey)
    }
  }
  return out
}

const getPackHighlightParts = (pack) => {
  const packData = pack?.partPackData
  if (!packData || typeof packData !== "object") return null
  const packParts = packData.parts
  if (!packParts || typeof packParts !== "object" || Array.isArray(packParts)) return null
  const slotPartPathMap = buildSlotPartPathMap(currentTree.value)
  const parts = {}
  for (const slotName of Object.keys(packParts)) {
    const partPath = slotPartPathMap[slotName]
    if (partPath) parts[partPath] = true
  }
  return Object.keys(parts).length ? parts : null
}

const highlightPack = async (pack) => {
  if (waitingForData.value || !currentTree.value || !currentVehID.value) return
  if (highlightedPackName.value === pack.name) return
  const parts = getPackHighlightParts(pack)
  if (!parts) return
  highlightedPackName.value = pack.name
  await lua.extensions.core_vehicle_partmgmt.selectParts(parts, currentVehID.value)
}

const clearPackHighlight = async () => {
  if (waitingForData.value || !currentVehID.value) return
  if (!highlightedPackName.value) return
  highlightedPackName.value = null
  await lua.extensions.core_vehicle_partmgmt.showHighlightedParts(currentVehID.value)
}

const mergeLeft = (target, source) => {
  if (!target || !source) return
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
        target[key] = {}
      }
      mergeLeft(target[key], value)
    } else {
      target[key] = value
    }
  }
}

const applyPartsToTree = (node, parts, packName, nodeKey = null) => {
  if (!node || !parts) return
  const slotName = node.id || nodeKey
  if (slotName && Object.prototype.hasOwnProperty.call(parts, slotName)) {
    node.chosenPartName = parts[slotName]
    node.decisionMethod = "partpack"
    node.partpackname = packName
  }
  if (node.children) {
    for (const [childKey, child] of Object.entries(node.children)) {
      applyPartsToTree(child, parts, packName, childKey)
    }
  }
}

const write = queue.wrap("write", async (tree) => {
  await lua.extensions.core_vehicle_partmgmt.setPartsTreeConfig(tree, true, null)
}, {
  write: queue.resolution.merge,
})

const applySelectedPacks = async () => {
  if (!currentTree.value) return
  const nextTree = JSON.parse(JSON.stringify(currentTree.value))
  pendingPathRestore.value = currentPath.value
  const selections = Object.entries(selectedByPath).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [, packName] of selections) {
    const pack = partPacks.value?.[packName]
    const packData = pack?.partPackData
    if (packData && typeof packData === "object") {
      if (packData.parts && typeof packData.parts === "object" && !Array.isArray(packData.parts)) {
        applyPartsToTree(nextTree, packData.parts, pack?.name || packName)
      }
      const { parts, ...rest } = packData
      mergeLeft(nextTree, rest)
    }
  }
  await write(nextTree)
}

const selectPack = async (pack) => {
  blinkPackName.value = pack.name
  if (blinkTimeoutId) clearTimeout(blinkTimeoutId)
  blinkTimeoutId = setTimeout(() => {
    if (blinkPackName.value === pack.name) blinkPackName.value = null
  }, 700)
  const key = currentPath.value
  if (selectedByPath[key] === pack.name) {
    delete selectedByPath[key]
    await applySelectedPacks()
    return
  }
  selectedByPath[key] = pack.name
  await applySelectedPacks()
}
</script>

<style lang="scss" scoped>
.parts-packs {
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  width: 100%;
  height: 100%;

  > * {
    flex: 0 0 auto;
    padding: 0 1em;
  }

  &.with-background {
    background-color: rgba(0, 0, 0, 0.6);
  }
}

.parts-packs-content {
  flex: 1 1 auto;
  padding: 0.75em 1em;
  overflow-y: auto;
}

.packs-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.parts-packs-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
}

.path-label {
  font-weight: 600;
  color: var(--bng-off-white);
}

.packs-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.group-title {
  font-size: 0.85rem;
  color: var(--bng-orange-300);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.6);
}

.folder-button {
  flex: 1 1 auto;
  justify-content: flex-start;
  text-align: left;
  --bng-button-max-width: 100%;
}

.folder-next {
  min-width: unset !important;
  min-height: unset !important;
}

.pack-item-button {
  width: 100%;
  max-width: none;
  --bng-button-max-width: 100%;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  text-align: left;
  padding: 0.7rem 0.9rem;
  border-radius: var(--bng-corners-1);
  background-color: rgba(var(--bng-cool-gray-900-rgb), 0.6);
}

:deep(.pack-item-button .bng-button-content) {
  width: 100%;
}

.pack-selected {
  box-shadow: inset 0 0 0 2px var(--bng-orange);
}

.pack-blink {
  animation: pack-blink 0.7s ease-in-out;
}

@keyframes pack-blink {
  0%,
  100% {
    box-shadow: inset 0 0 0 2px var(--bng-orange);
  }
  50% {
    box-shadow: inset 0 0 0 2px var(--bng-off-white);
  }
}

.pack-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.pack-info {
  flex: 1 1 auto;
  min-width: 0;
}

.pack-title {
  font-weight: 600;
}

.pack-meta {
  color: var(--bng-orange-300);
  font-size: 0.9rem;
}

.pack-icon {
  font-size: 3rem;
}

.pack-description {
  color: var(--bng-off-white);
  font-size: 0.9rem;
}

.pack-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.packs-empty {
  color: var(--bng-off-white);
}
</style>
