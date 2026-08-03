// Debug routes --------------------------------------
import ComponentsView from "@/modules/debug/views/ComponentsView.vue"
import RoutesListView from "@/modules/debug/views/RouteListView.vue"
import ControllerUITest from "@/modules/debug/views/ControllerUITest.vue"
import AsyncBulkLoaderDemo from "@/modules/debug/views/AsyncBulkLoaderDemo.vue"
import ActiviityStart from "@/modules/activitystart/views/ActivityStart.vue"
import MilestoneMain from "@/modules/milestones/views/MilestoneMain.vue"
import LuaRouteDebugScreen from "@/modules/debug/views/LuaRouteDebugScreen.vue"
import ScopedNavView from "@/modules/debug/views/ScopedNavView.vue"
import SimpleTest from "@/modules/debug/views/scopedNav/SimpleTest.vue"
import LifecycleEventsTest from "@/modules/debug/views/scopedNav/LifecycleEventsTest.vue"
import PassthroughTest from "@/modules/debug/views/scopedNav/PassthroughTest.vue"
import NoNavTypeTest from "@/modules/debug/views/scopedNav/NoNavTypeTest.vue"
import ContainerTypeTest from "@/modules/debug/views/scopedNav/ContainerTypeTest.vue"
import ActivationGuardsTest from "@/modules/debug/views/scopedNav/ActivationGuardsTest.vue"
import AutoFocusTest from "@/modules/debug/views/scopedNav/AutoFocusTest.vue"
import BubblingEventsTest from "@/modules/debug/views/scopedNav/BubblingEventsTest.vue"
import IgnoreEventsTest from "@/modules/debug/views/scopedNav/IgnoreEventsTest.vue"
import ScopeSwitchingTest from "@/modules/debug/views/scopedNav/ScopeSwitchingTest.vue"
import TrapPolicyTest from "@/modules/debug/views/scopedNav/TrapPolicyTest.vue"
import PopoverTest from "@/modules/debug/views/scopedNav/PopoverTest.vue"
import ActivateOnMountTest from "@/modules/debug/views/scopedNav/ActivateOnMountTest.vue"
import ActivatedTest from "@/modules/debug/views/scopedNav/ActivatedTest.vue"
import ReactivityTest from "@/modules/debug/views/scopedNav/ReactivityTest.vue"
import ContainerEscapeGuardTest from "@/modules/debug/views/scopedNav/ContainerEscapeGuardTest.vue"

export default [
  {
    path: "/components/:component?",
    name: "debug.components",
    component: ComponentsView,
    props: true,
    meta: {
      infoBar: { visible: false },
      topBar: { visible: false },
      uiApps: { shown: false },
    }
  },
  {
    path: "/routelist",
    name: "routelist",
    component: RoutesListView,
  },
  {
    path: "/scopedNav",
    name: "debug.scopedNav",
    component: ScopedNavView,
    children: [
      {
        path: "simple",
        name: "debug.scopedNav-simple",
        component: SimpleTest,
      },
      {
        path: "lifecycle",
        name: "debug.scopedNav-lifecycle",
        component: LifecycleEventsTest,
      },
      {
        path: "passthrough",
        name: "debug.scopedNav-passthrough",
        component: PassthroughTest,
      },
      {
        path: "noNavType",
        name: "debug.scopedNav-noNavType",
        component: NoNavTypeTest,
      },
      {
        path: "containerType",
        name: "debug.scopedNav-containerType",
        component: ContainerTypeTest,
      },
      {
        path: "activationGuards",
        name: "debug.scopedNav-activationGuards",
        component: ActivationGuardsTest,
      },
      {
        path: "autoFocus",
        name: "debug.scopedNav-autoFocus",
        component: AutoFocusTest,
      },
      {
        path: "bubblingEvents",
        name: "debug.scopedNav-bubblingEvents",
        component: BubblingEventsTest,
      },
      {
        path: "ignoreEvents",
        name: "debug.scopedNav-ignoreEvents",
        component: IgnoreEventsTest,
      },
      {
        path: "scopeSwitching",
        name: "debug.scopedNav-scopeSwitching",
        component: ScopeSwitchingTest,
      },
      {
        path: "trapPolicy",
        name: "debug.scopedNav-trapPolicy",
        component: TrapPolicyTest,
      },
      {
        path: "reactivity",
        name: "debug.scopedNav-reactivity",
        component: ReactivityTest,
      },
      {
        path: "activated",
        name: "debug.scopedNav-activated",
        component: ActivatedTest,
      },
      {
        path: "activateOnMount",
        name: "debug.scopedNav-activateOnMount",
        component: ActivateOnMountTest,
      },
      {
        path: "popover",
        name: "debug.scopedNav-popover",
        component: PopoverTest,
      },
      {
        path: "containerEscapeGuard",
        name: "debug.scopedNav-containerEscapeGuard",
        component: ContainerEscapeGuardTest,
      },
    ],
  },
  {
    path: "/controllerUITest",
    name: "controllerUITest",
    component: ControllerUITest,
  },
  {
    path: "/asyncBulkLoader",
    name: "debug.asyncBulkLoader",
    component: AsyncBulkLoaderDemo,
    meta: {
      infoBar: { visible: false },
      topBar: { visible: false },
      uiApps: { shown: false },
    },
  },
  {
    path: "/ActivityStart",
    name: "ActivityStart",
    component: ActiviityStart,
  },
  {
    path: "/milestones_",
    name: "milestones_",
    component: MilestoneMain,
  },
  {
    path: "/luaRouteDebugScreen",
    name: "luaRouteDebugScreen",
    component: LuaRouteDebugScreen,
  },
]
