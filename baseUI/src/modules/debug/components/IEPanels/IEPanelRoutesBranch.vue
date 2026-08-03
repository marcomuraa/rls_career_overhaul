<template>
  <template v-for="node in nodes" :key="nodeKey(node)">
    <tr
      class="tree-row"
      :class="[rowStateClass(node)]"
      @mouseenter="onMouseEnter(node)"
      @mouseleave="onMouseLeave(node)"
    >
      <td class="cell-route" @click="onRouteCellClick(node)" v-bng-double-click="() => onRouteCellDoubleClick(node)">
        <div class="route-wrap" :style="{ paddingLeft: `${depth * 1.1}rem` }">
          <span
            v-if="hasRowChildren(node)"
            class="toggle"
          >
            <BngIcon :type="isExpanded(node) ? icons.arrowSmallDown : icons.arrowSmallRight" />
          </span>
          <span v-else class="toggle-spacer"></span>
          <span
            class="name"
            :ref="el => registerTreeRow(node, el)"
          >{{ nodeLabel(node) }}</span>
          <button
            v-if="kind === 'route' && hoveredKey === nodeKey(node) && node.isRoute"
            class="go-btn"
            bng-no-nav="true"
            tabindex="-1"
            type="button"
            @click.stop="goToRoute(node)"
          >Go</button>
        </div>
      </td>
      <td class="cell-flags" :class="{ multiline: isScopeFlagsMultiline(node) }" @click="onFlagsCellClick(node)">
        <template v-if="kind === 'route'">
          <span v-if="node.flags?.dev" class="flag flag-dev">Dev</span>
          <span v-if="node.flags?.lua" class="flag flag-lua">Lua</span>
          <span v-if="node.flags?.vue" class="flag flag-vue">Vue</span>
          <span v-if="node.flags?.ng" class="flag flag-ng">Ng</span>
          <span v-if="node.fullName === activeRouteName" class="flag flag-active">Active</span>
        </template>
        <template v-else>
          <span class="scope-meta">{{ capitalise(node.state || "inactive") }}</span>
          <span v-if="node.bubbleWhitelistEvents?.length" class="scope-meta">Bubble: {{ node.bubbleWhitelistEvents.join("/") }}</span>
          <span v-if="node.hasCanBubbleEvent" class="scope-meta">BubbleFn</span>
        </template>
      </td>
    </tr>

    <template v-if="isExpanded(node)">
      <IEPanelRoutesBranch
        v-if="kind === 'route' && node.fullName === activeRouteName && navigatorScopeTree.length"
        :nodes="navigatorScopeTree"
        :depth="depth + 1"
        kind="scope"
        :multiline-scope-row-id="multilineScopeRowId"
        :expanded-routes="expandedRoutes"
        :expanded-scopes="expandedScopes"
        :active-scope-id="activeScopeId"
        @toggle-node="emit('toggle-node', $event)"
        @go-route="emit('go-route', $event)"
        @scope-row-clicked="emit('scope-row-clicked', $event)"
        @hover-scope="emit('hover-scope', $event)"
        @leave-scope="emit('leave-scope')"
        @register-route-row="emit('register-route-row', $event)"
        @register-scope-row="emit('register-scope-row', $event)"
        @active-route-mounted="emit('active-route-mounted', $event)"
        @active-scope-mounted="emit('active-scope-mounted', $event)"
      />
      <IEPanelRoutesBranch
        v-if="node.children?.length"
        :nodes="node.children"
        :depth="depth + 1"
        :kind="kind"
        :active-route-name="activeRouteName"
        :multiline-scope-row-id="multilineScopeRowId"
        :expanded-routes="expandedRoutes"
        :expanded-scopes="expandedScopes"
        :active-scope-id="activeScopeId"
        @toggle-node="emit('toggle-node', $event)"
        @go-route="emit('go-route', $event)"
        @scope-row-clicked="emit('scope-row-clicked', $event)"
        @hover-scope="emit('hover-scope', $event)"
        @leave-scope="emit('leave-scope')"
        @register-route-row="emit('register-route-row', $event)"
        @register-scope-row="emit('register-scope-row', $event)"
        @active-route-mounted="emit('active-route-mounted', $event)"
        @active-scope-mounted="emit('active-scope-mounted', $event)"
      />
    </template>
  </template>
</template>

<script setup>
import { ref, inject, onMounted } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import { vBngDoubleClick } from "@/common/directives"

const props = defineProps({
  nodes: {
    type: Array,
    default: () => [],
  },
  depth: {
    type: Number,
    default: 0,
  },
  kind: {
    type: String,
    default: "route",
  },
  activeRouteName: {
    type: String,
    default: "",
  },
  activeScopeId: {
    type: String,
    default: "",
  },
  multilineScopeRowId: {
    type: String,
    default: "",
  },
  expandedRoutes: {
    type: Object,
    default: () => ({}),
  },
  expandedScopes: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits([
  "toggle-node",
  "go-route",
  "scope-row-clicked",
  "hover-scope",
  "leave-scope",
  "register-route-row",
  "register-scope-row",
  "active-route-mounted",
  "active-scope-mounted",
])

const navigatorScopeTree = inject("navigatorScopeTree", ref([]))

const hoveredKey = ref(null)

const capitalise = text => String(text || "").charAt(0).toUpperCase() + String(text || "").slice(1)

const nodeKey = node => node.id || node.fullName || node.scopeId || node.label

const nodeLabel = node => (props.kind === "scope" ? (node.label || node.id || "scope") : (node.label || node.fullName))

function hasRowChildren(node) {
  if (node.children?.length) return true
  return props.kind === "route" && node.fullName === props.activeRouteName && navigatorScopeTree.value.length > 0
}

function isExpanded(node) {
  const key = nodeKey(node)
  if (props.kind === "scope") return !!props.expandedScopes[key]
  return !!props.expandedRoutes[key]
}

function toggleNode(node) {
  emit("toggle-node", {
    kind: props.kind,
    key: nodeKey(node),
    node,
  })
}

function onRouteCellClick(node) {
  toggleNode(node)
}

function goToRoute(node) {
  emit("go-route", node.fullName)
}

function onRouteCellDoubleClick(node) {
  if (props.kind !== "route") return
  if (!node?.isRoute || !node?.fullName) return
  goToRoute(node)
}

function rowStateClass(node) {
  if (props.kind === "scope") {
    if (node.state === "active") return "scope-active"
    if (node.state === "suspended") return "scope-suspended"
    return "scope-inactive"
  }
  return node.fullName === props.activeRouteName ? "route-active" : "route-inactive"
}

function isScopeFlagsMultiline(node) {
  if (props.kind !== "scope") return false
  return props.multilineScopeRowId === node?.id
}

function toggleFlagsMultiline(node) {
  if (props.kind !== "scope" || !node?.id) return
  emit("scope-row-clicked", node.id)
}

function onFlagsCellClick(node) {
  toggleFlagsMultiline(node)
}

function registerTreeRow(node, el) {
  if (props.kind === "route" && node.fullName) {
    emit("register-route-row", { name: node.fullName, el })
    return
  }
  if (props.kind === "scope" && node.id) {
    emit("register-scope-row", { id: node.id, el })
  }
}

function onMouseEnter(node) {
  hoveredKey.value = nodeKey(node)
  if (props.kind === "scope") emit("hover-scope", node)
}

function onMouseLeave() {
  hoveredKey.value = null
  if (props.kind === "scope") emit("leave-scope")
}

onMounted(() => {
  if (props.kind === "route") {
    const hasActiveRoute = (props.nodes || []).some(node => node?.fullName === props.activeRouteName)
    if (hasActiveRoute && props.activeRouteName) {
      emit("active-route-mounted", props.activeRouteName)
    }
    return
  }

  if (props.kind === "scope") {
    const hasActiveScope = (props.nodes || []).some(node => node?.id === props.activeScopeId)
    if (hasActiveScope && props.activeScopeId) {
      emit("active-scope-mounted", props.activeScopeId)
    }
  }
})
</script>

<style lang="scss" scoped>
.tree-row {
  cursor: pointer;

  &:hover {
    background: #fff1;
  }
}

.cell-route,
.cell-flags {
  padding: 0.1rem 0.2rem;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-route {
  width: 70%;
}

.cell-flags {
  width: 30%;
  white-space: nowrap;

  &.multiline {
    white-space: normal;
    overflow-wrap: anywhere;
  }
}

.route-wrap {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 1.35rem;
  min-width: 0;
}

.toggle {
  width: 1rem;
  height: 1rem;
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-spacer {
  width: 1rem;
  height: 1rem;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.go-btn {
  margin-left: auto;
  border: none;
  border-radius: var(--bng-corners-1);
  font-size: 0.72rem;
  padding: 0 0.3rem;
  height: 1rem;
  line-height: 1rem;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
}

.flag {
  display: inline-block;
  margin-right: 0.25rem;
  font-size: 0.82em;
}

.flag-dev {
  color: var(--bng-orange-500);
}

.flag-lua {
  color: var(--bng-add-blue-500);
}

.flag-vue {
  color: var(--bng-add-green-400);
}

.flag-ng {
  color: var(--bng-add-red-600);
}

.flag-active {
  color: var(--bng-off-white);
}

.scope-meta {
  color: var(--bng-cool-gray-200);
  margin-right: 0.35rem;
  font-size: 0.82em;
}

.route-active {
  color: var(--bng-add-indigoblue-300);
}

.route-inactive {
  color: var(--bng-add-indigoblue-500);
}

.scope-active {
  color: var(--bng-add-magenta-200);
}

.scope-suspended {
  color: var(--bng-add-magenta-400);
}

.scope-inactive {
  color: var(--bng-add-magenta-600);
}
</style>
