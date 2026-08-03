import { default as TaskList } from "./components/TaskList.vue"
import { useTasksStore } from "@/services/tasklistStore"

export const __bngUiMod = {
  components: {
    TaskList,
  },
  directives: {},
  others: {
    useTasksStore,
  },
}
