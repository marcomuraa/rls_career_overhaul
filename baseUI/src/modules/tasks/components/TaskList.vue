<template>
  <div class="tasks-container" :class="{ animate: animationSettings.animate }">
    <Transition enter-active-class="show" leave-active-class="remove" :css="animationSettings.animate" @before-leave="onBeforeHeaderLeave">
      <div v-if="displayedHeader" class="header-wrapper" :class="{ 'show-animate': canAnimate }">
        <TaskHeader v-bind="displayedHeader" class="header" />
      </div>
    </Transition>

    <div class="tasks-content" ref="tasksScroller">
      <TransitionGroup
        enter-active-class="show"
        leave-active-class="remove"
        :css="animationSettings.animate"
        @before-leave="onBeforeLeave"
        @before-enter="onBeforeEnterTask"
      >
        <div
          v-for="(task, index) in displayedTasks"
          :key="task.id"
          class="task-wrapper"
          :class="{ 'show-animate': canAnimate, 'remove-animate': canAnimate }"
          :data-id="index"
        >
          <TaskMessage v-if="task.type === 'message'" v-bind="task" class="task-card" />
          <TaskGoal
            v-else-if="task.type === 'goal'"
            v-bind="task"
            class="task-card"
            :class="{ glow: animationSettings.animateNextTask && nextTask && nextTask.id === task.id }"
          />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeMount, inject, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import TaskGoal from "./TaskGoal.vue"
import TaskHeader from "./TaskHeader.vue"
import TaskMessage from "./TaskMessage.vue"
import useControls from "@/services/controls"

const props = defineProps({
  header: Object,
  tasks: Array,
  settings: {
    type: Object,
    default: {
      // master animation setting
      animate: false,

      // animates initial passed tasks on render
      animateOnMount: false,
      animateOnMountIntervalDelay: 0.2,

      animateOnEmpty: false,
      animateOnEmptyIntervalDelay: 0.2,

      // adds a glow animation to the next uncompleted task
      animateNextTask: false,

      taskCompleteCallback: {
        type: Function,
        required: false,
      },
    },
  },
})

const animationSettings = inject("animationSettings", props.settings)
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)

const previousTasks = ref(null)

// local cached data
const internalTasks = ref(null)
const tasksScroller = ref(null)

const canAnimate = computed(() => {
  if (!animationSettings.animate) return false

  if (previousTasks.value === null && !animationSettings.animateOnMount) return false

  return true
})

const displayedHeader = computed(() => {
  if (!props.header) return props.header

  return {
    ...props.header,
    title: getContextText(props.header.title, props.header.titleController),
    description: getContextText(props.header.description, props.header.descriptionController),
  }
})

const displayedTasks = computed(() => {
  if (!internalTasks.value) return []

  return internalTasks.value.map(task => ({
    ...task,
    label: getContextText(task.label, task.labelController),
    description: getContextText(task.description, task.descriptionController),
  }))
})

const nextTask = computed(() => {
  return internalTasks.value.find(x => x.type === "goal" && !x.complete && x.attention)
})

const onBeforeHeaderLeave = el => {
  el.style.animationDelay = "0s"
}

const onBeforeLeave = (el, done) => {
  el.style.animationDelay = "0s"
}

const onBeforeEnterTask = el => {
  const dataId = el.getAttribute("data-id")
  const offset = props.header ? 1 : 0

  const delay = previousTasks.value === null || previousTasks.value.length === 0 ? animationSettings.animateOnMountIntervalDelay * (Number(dataId) + offset) : 0

  el.style.animationDelay = delay + "s"

  requestAnimationFrame(() => {
    if (tasksScroller.value) tasksScroller.value.scrollTop = tasksScroller.value.scrollHeight
  })
}

onBeforeMount(() => {
  if (!internalTasks.value || internalTasks.value.length === 0) {
    internalTasks.value = unwrapProxy(props.tasks)
  }
})

watch(
  () => props.tasks,
  async (newValue, oldValue) => {
    if (internalTasks.value !== null) previousTasks.value = internalTasks.value && internalTasks.value.length > 0 ? unwrapProxy([...internalTasks.value]) : []

    internalTasks.value = unwrapProxy(props.tasks)
  },
  { deep: true }
)

function unwrapProxy(reactiveList) {
  return reactiveList.map(x => {
    const val = Object.assign({}, x)
    return val
  })
}

function getContextText(defaultText, controllerText) {
  if (!isControllerUsed.value) return defaultText
  return controllerText !== undefined && controllerText !== null && controllerText !== "" ? controllerText : defaultText
}
</script>

<style scoped lang="scss">
$goalSuccessBackground: #40444f;
$goalFailBackground: #6c1313;
$textColor: #ffffff;

.tasks-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  height: 100%;
  padding: 0 0.25em;
  box-sizing: border-box !important;
  font-family: "Overpass", var(--fnt-defs);
  color: $textColor;
  overflow: hidden;

  > .header-wrapper {
    flex-shrink: 0;
    width: 100%;
    margin-bottom: 0.2em;
    transform-origin: top right;
  }

  > .tasks-content {
    width: 100%;
    overflow: scroll;
    flex-shrink: 1;

    &::-webkit-scrollbar {
      display: none;
    }

    > .task-wrapper {
      flex-shrink: 0;
      transform-origin: top right;

      > .task-card {
        transform-origin: right;
      }

      &:not(:last-child) {
        margin-bottom: 0.125em;
      }
    }
  }

  &.animate {
    > .header-wrapper,
    > .tasks-content > .task-wrapper {
      &.show.show-animate {
        opacity: 0;
        animation: slideIn 0.4s linear forwards;
      }

      &.remove.remove-animate {
        opacity: 1;
        animation: slideUp 0.2s linear forwards;
      }
    }

    > .tasks-content > .task-wrapper {
      > .task-card.glow {
        animation: glow 1s infinite alternate;
        animation-delay: 2s !important;
      }
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }

  to {
    transform: translateX(0%);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(0%);
  }

  to {
    transform: translateY(-100%);
  }
}

@keyframes glow {
  from {
    background: rgba(0, 0, 0, 0.8);
  }

  to {
    background: rgba(var(--bng-orange-650-rgb), 0.8);
  }
}
</style>
