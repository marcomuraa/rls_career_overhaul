import { ref, computed } from "vue"
import { defineStore } from "pinia"
import { useBridge } from "@/bridge"
import { useControllerActionItems } from "@/services/actionItems"

const DEFAULT_VISIBLE_IN = Object.freeze({
  play: true,
  vehicleConfiguration: false,
  gridSelector: false,
})

export const useTasksStore = defineStore("tasks", () => {
  const header = ref(null)
  const tasksById = ref([])
  const visibleIn = ref({ ...DEFAULT_VISIBLE_IN })
  const { normalizeActionItems, filterActionItemsForController } = useControllerActionItems()

  const tasks = computed(() => tasksById.value.map(filterActionItemsForController))
  const { events } = useBridge()
  let started = false

  const completeTasklistGoal = id => updateTasklistItem(id, {complete:true, success:true})
  const failTasklistGoal = id => updateTasklistItem(id, {complete:true, success:false})

  const eventHandlers = [
    ["SetTasklistHeader", setTasklistHeader],
    ["SetTasklistTask", setTasklistTask],
    ["SetTasklistVisibleIn", setTasklistVisibleIn],
    ["ResetTasklistVisibleIn", resetTasklistVisibleIn],
    ["UpdateTasklistItem", updateTasklistItem],
    ["SortTasklistItems", sortTasklistItems],
    ["CompleteTasklistGoal", completeTasklistGoal],
    ["FailTasklistGoal", failTasklistGoal],
    ["DiscardTasklistItem", discardTasklistItem],
    ["HighlightTasklistItem", highlightTasklistItem],
    ["HideCareerTasklist", hideCareerTasklist],
    ["ClearTasklist", clearTasklist],
  ]

  function start() {
    if (started) return
    started = true
    eventHandlers.forEach(([name, handler]) => events.on(name, handler))
  }

  function stop() {
    if (!started) return
    eventHandlers.forEach(([name, handler]) => events.off(name, handler))
    started = false
  }

  function setTasklistHeader(data) {
    if(data === undefined || data === null || data == "") {
      header.value = null
    } else {
      const description = data.subtext !== 0 ? data.subtext : ""
      const descriptionController = data.subtextController !== 0 ? data.subtextController : ""
      header.value = {
        title: data.label,
        description: description,
        titleController: data.labelController,
        descriptionController: descriptionController,
      }
    }
  }

  function setTasklistTask(data) {
    const id = data.id === null || data.id === undefined ? "default" : data.id
    const index = tasksById.value.findIndex(x => x.id === id)

    if (index === -1 && data.clear) return

    if (data.clear) {
      tasksById.value.splice(index, 1)
      return
    }

    const isComplete = (data.done !== undefined && data.done) || (data.fail !== undefined && data.fail)
    const isSuccess = (data.done !== undefined && data.done) || (data.fail !== undefined && !data.fail)
    const description = data.subtext !== 0 ? data.subtext : ""
    const descriptionController = data.subtextController !== 0 ? data.subtextController : ""
    const actionItems = normalizeActionItems(data.actionItems, [])

    if (index === -1) {
      tasksById.value.push({
        id: data.id,
        label: data.label,
        description: description,
        labelController: data.labelController,
        descriptionController: descriptionController,
        type: data.type,
        attention: data.attention,
        complete: isComplete,
        success: isSuccess,
        actionItems,
      })
    } else {
      tasksById.value[index].attention = data.attention
      tasksById.value[index].complete = isComplete
      tasksById.value[index].success = isSuccess

      if(data.subtext !== undefined)
        tasksById.value[index].description = description

      if(data.label !== undefined)
        tasksById.value[index].label = data.label

      if(data.labelController !== undefined)
        tasksById.value[index].labelController = data.labelController

      if(data.subtextController !== undefined)
        tasksById.value[index].descriptionController = descriptionController

      if(data.type !== undefined)
        tasksById.value[index].type = data.type

      if(data.actionItems !== undefined)
        tasksById.value[index].actionItems = actionItems

    }
  }

  function updateTasklistItem(id, data) {
    const index = tasksById.value.findIndex((task) => task.id === id);

    if (index !== -1) {
      Object.keys(data).forEach((key) => {
        if (tasksById.value[index][key] !== undefined) {
          tasksById.value[index][key] = data[key];
        }
      });
    }
  }

  function sortTasklistItems(order) {
    // Separate tasks into two lists: inOrderTasks and notInOrderTasks
    const inOrderTasks = []
    const notInOrderTasks = []

    tasksById.value.forEach((task) => {
      if (order.includes(task.id)) {
        inOrderTasks.push(task)
      } else {
        notInOrderTasks.push(task)
      }
    })

    // Sort inOrderTasks based on the provided order
    inOrderTasks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

    // Set tasksById.value to the concatenation of inOrderTasks and notInOrderTasks
    tasksById.value = [...inOrderTasks, ...notInOrderTasks]
  }

  function discardTasklistItem(id, delay) {
    if(delay !== undefined && delay > 0) {
      // Use setTimeout to delay the removal of the task
      setTimeout(() => {
        setTasklistTask({id:id, clear:true})
      }, delay*1000);
    } else {
      setTasklistTask({id:id, clear:true})
    }
  }

  //Animation seems to start on the non-highlighted part. So it takes around 1s for the highlight to be visible
  function highlightTasklistItem(id, duration) {
    setTasklistTask({id:id, attention:true})
    if(duration !== undefined && duration > 0) {
      // Use setTimeout to delay the removal of the task
      setTimeout(() => {
        setTasklistTask({id:id, attention:false})
      }, duration*1000);
    }
  }

  function hideCareerTasklist() {}

  function setTasklistVisibleIn(data, visible) {
    if (typeof data === "string") {
      if (DEFAULT_VISIBLE_IN[data] === undefined) return
      visibleIn.value = {
        ...visibleIn.value,
        [data]: !!visible,
      }
      return
    }

    if (!data || typeof data !== "object") return

    const nextVisibleIn = { ...visibleIn.value }
    Object.keys(DEFAULT_VISIBLE_IN).forEach(key => {
      if (data[key] !== undefined) nextVisibleIn[key] = !!data[key]
    })
    visibleIn.value = nextVisibleIn
  }

  function resetTasklistVisibleIn() {
    visibleIn.value = { ...DEFAULT_VISIBLE_IN }
  }

  function clearTasklist() {
    header.value = null
    tasksById.value = []
  }

  const hasItems = computed(() => tasks.value.length > 0 || header.value !== null)

  return {
    header,
    tasks,
    hasItems,
    visibleIn,
    start,
    stop,
    setTasklistVisibleIn,
    resetTasklistVisibleIn,
  }
})
