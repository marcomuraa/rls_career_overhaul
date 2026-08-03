<template>
  <LayoutSingle>
    <div class="scoped-nav-demos" v-bng-on-ui-nav:back="goBack">
      <!-- Header with conditional back button -->
      <div class="demo-header">
        <BngButton v-if="isChildRoute" bng-no-nav="true" accent="attention" class="back-button" @click="goBack"> ← Back to Index </BngButton>
        <BngScreenHeading>Scoped Navigation Demos</BngScreenHeading>
      </div>

      <!-- Demo grid - only show on index page -->
      <div v-if="!isChildRoute" class="demo-grid" v-bng-scoped-nav="{ type: 'container' }">
        <BngCard
          v-for="demo in demos"
          :key="demo.name"
          bng-nav-item
          class="demo-card"
          :data-testid="`demo-card-${demo.name}`"
          @click="navigateToDemo(demo.route)">
          <BngCardHeading>{{ demo.title }}</BngCardHeading>
          <p>{{ demo.description }}</p>
        </BngCard>
      </div>

      <!-- Child route content -->
      <div class="child-route-content">
        <router-view v-if="isChildRoute" />
      </div>
    </div>
  </LayoutSingle>
</template>

<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import { LayoutSingle } from "@/common/layouts"
import { BngScreenHeading, BngCard, BngCardHeading, BngButton } from "@/common/components/base"
import { vBngOnUiNav, vBngScopedNav } from "@/common/directives"
import { useBridge } from "@/bridge"

const { lua } = useBridge()
const route = useRoute()

// Check if we're on a child route
const isChildRoute = computed(() => {
  return route.name !== "debug.scopedNav"
})

const demos = [
  {
    name: "simple",
    title: "Basic Examples",
    description: "Basic scoped navigation with normal type",
    route: "debug.scopedNav-simple",
  },
  {
    name: "lifecycle",
    title: "Lifecycle Events",
    description: "Handlers to listen for the scope's lifecycle updates",
    route: "debug.scopedNav-lifecycle",
  },
  {
    name: "passthrough",
    title: "Passthrough",
    description: "Passthrough is enabled if no UINav events are bound to more than one element and all navigable items are bound to a UINav event.",
    route: "debug.scopedNav-passthrough",
  },
  {
    name: "noNavType",
    title: "No Nav Type",
    description: "No nav type disallows any focus navigation within it.",
    route: "debug.scopedNav-noNavType",
  },
  {
    name: "containerType",
    title: "Container Type",
    description: "Container type allows navigation towards its child elements.",
    route: "debug.scopedNav-containerType",
  },
  {
    name: "activationGuards",
    title: "Activation Guards",
    description: "Use the canActivate and canDeactivate guards to control whether the scope can be activated or deactivated when using a controller.",
    route: "debug.scopedNav-activationGuards",
  },
  {
    name: "reactivity",
    title: "Reactivity",
    description: "Renders toggle between buttons to test updates focus handling.",
    route: "debug.scopedNav-reactivity",
  },
  {
    name: "activated",
    title: "Activated (Reactive)",
    description: "Control scope activation using the reactive 'activated' setting.",
    route: "debug.scopedNav-activated",
  },
  {
    name: "activateOnMount",
    title: "Activate On Mount",
    description: "Automatically activate a scope after mount using a ref binding.",
    route: "debug.scopedNav-activateOnMount",
  },
  {
    name: "autoFocus",
    title: "Auto-focus",
    description: "Prefer auto-focus on activate",
    route: "debug.scopedNav-autoFocus",
  },
  {
    name: "bubblingEvents",
    title: "Bubbling Events",
    description: "Allow or deny events from this scope to bubble up to the parent scope or to the global handler.",
    route: "debug.scopedNav-bubblingEvents",
  },
  {
    name: "ignoreEvents",
    title: "Ignore Events",
    description: "Ignore events from this scope to prevent them from being handled.",
    route: "debug.scopedNav-ignoreEvents",
  },
  {
    name: "scopeSwitching",
    title: "Scope Switching",
    description: "Switch between scopes using controller events.",
    route: "debug.scopedNav-scopeSwitching",
  },
  {
    name: "trapPolicy",
    title: "Trap Policy",
    description: "Control the trap policy for the scope.",
    route: "debug.scopedNav-trapPolicy",
  },
  {
    name: "popover",
    title: "Popover",
    description: "Popover scoped navigation type: standalone vs nested behavior.",
    route: "debug.scopedNav-popover",
  },
]

function navigateToDemo(routeName) {
  lua.extensions.ui_router.navigate(routeName, null, null)
}

function goBack(event) {
  if (isChildRoute.value) {
    lua.extensions.ui_router.navigate("debug.scopedNav")
  } else {
    lua.extensions.ui_router.back()
  }
  event.stopPropagation()
}
</script>

<style lang="scss" scoped>
.scoped-nav-demos {
  width: 100%;
  padding: 1rem;
}

.demo-header {
  margin-bottom: 2rem;

  .back-button {
    margin-bottom: 1rem;
  }
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.demo-card {
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  p {
    margin: 0.5rem 0;
    color: var(--text-secondary);
  }
}

.child-route-content {
  display: flex;
  padding: 1rem;
}
</style>
