import { default as MessagesList } from "./components/MessagesList.vue"
import { useMessagesStore } from "@/services/messagesStore"

export const __bngUiMod = {
  components: {
    MessagesList,
  },
  directives: {},
  others: {
    useMessagesStore,
  },
}
