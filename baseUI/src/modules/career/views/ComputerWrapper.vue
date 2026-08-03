<template>
  <LayoutMenu
    class="computer-wrapper-layout"
    nav-scope="root"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    :hide-breadcrumb-last-item="false"
    @breadcrumb-click="breadcrumbClick"
    @breadcrumb-back="emit('back')"
  >
    <template #heading>
      <BngScreenHeadingV2 type="2">
        <slot name="title">{{ $t(title) }}</slot>
      </BngScreenHeadingV2>
    </template>

    <template #topbar-right>
      <BngCard class="status-container" :class="{ 'status-container-highlight': statusHighlight }" v-bng-blur="true">
        <CareerStatus ref="elStatus" />
        <div v-if="$slots.status" class="status-add">
          <slot name="status"></slot>
        </div>
      </BngCard>
    </template>

    <div class="main-content-slotted" v-bng-on-ui-nav:back="() => emit('back')">
      <slot></slot>
    </div>

    <template v-if="store.tasks?.length || $slots.side" #side-tasklist>
      <div class="side-content-slotted">
        <TaskList
          class="task-list"
          :header="store.header"
          :tasks="store.tasks" />
        <slot name="side"></slot>
      </div>
    </template>
  </LayoutMenu>
</template>

<script setup>
import { ref, provide, computed, onMounted, onUnmounted } from "vue"
import { useBridge } from "@/bridge"
import { LayoutMenu } from "@/common/layouts"
import { BngCard, BngScreenHeadingV2 } from "@/common/components/base"
import { vBngOnUiNav, vBngBlur } from "@/common/directives"
import { CareerStatus } from "@/modules/career/components"
import { TaskList } from '@/modules/tasks'
import { useTasksStore } from "@/services/tasklistStore"
import { useRouteDataStore } from "@/services/routeData"
import { $translate } from "@/services/translation"

const routeDataStore = useRouteDataStore()

defineProps({
  title: {
    type: String,
    default: () => $translate.instant("ui.career.shared.myComputer"),
  },
  wallpaperFull: Boolean,
  wallpaperHalf: Boolean,
  back: Boolean,
  close: Boolean,
})

const breadcrumbItems = computed(() => routeDataStore.breadcrumbs || [])

const elStatus = ref()
const store = useTasksStore()
const { events, lua } = useBridge()

const statusHighlight = ref(false)
const HIGHLIGHT_DURATION_MS = 4000

function triggerStatusHighlight() {
  statusHighlight.value = true
  setTimeout(() => {
    statusHighlight.value = false
  }, HIGHLIGHT_DURATION_MS)
}

onMounted(() => {
  events.on("highlightComputerStatus", triggerStatusHighlight)
})
onUnmounted(() => {
  events.off("highlightComputerStatus", triggerStatusHighlight)
})
provide('animationSettings', {
  animate: true,
  animateOnMount: false,
  animateOnMountIntervalDelay: 0.2,
  animateOnEmptyIntervalDelay: 0.1,
  animateOnEmpty: true,
  animateNextTask: true,
  successCallback: playAudio
})
function playAudio() {
  lua.Engine.Audio.playOnce('AudioGui', 'event:>UI>Career>Checkbox')
}

defineExpose({
  statusUpdate: () => elStatus.value.updateDisplay(),
})

async function breadcrumbClick(item) {
  if (!item) return
  if (item.closeAllMenus) {
    lua.career_career.closeAllMenus()
    return
  }
  if (item.routeName && !item.abstract) {
    await lua.extensions.ui_router.navigate(item.routeName, item.params)
  }
}

const emit = defineEmits(["back", "close"])
</script>

<style lang="scss" scoped>
.status-container {
  border-radius: var(--bng-corners-2);
  color: white;
  align-self: flex-start;
  box-shadow: 0 0 0 transparent;
  transition: box-shadow 0.6s ease-out;

  &.status-container-highlight {

    :deep(.card-cnt) {
      animation: status-container-highlight 4s ease-out;
    }
    @keyframes status-container-highlight {
      0% {
        background-color: var(--bng-orange-500);
      }
      50% {
        background-color: var(--bng-orange-500);
      }
      100% {
        background-color: rgba(var(--bng-off-black-rgb), 0.6)
      }
    }
  }

  .status-add {
    text-align: center;
    padding: 0.25rem 0.5rem;
  }
}

.main-content-slotted {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.side-content-slotted {
  flex: 0 0 33rem;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  .task-list {
    width: 33rem;
    align-self: flex-start;
  }
}
</style>
