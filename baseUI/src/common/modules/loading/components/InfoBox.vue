<template>
  <SlotSwitcher :slot-id="id">

    <template #multiplayer_cancel>
      <button @click="cancelJoinSession">{{ $tt("ui.common.cancel") }}</button>
    </template>

  </SlotSwitcher>
</template>

<script setup>
import { SlotSwitcher } from "@/common/components/utility"
import { lua } from "@/bridge"
defineProps({ id: { type: String, required: true } })

const cancelJoinSession = () => {
  if (lua.multiplayer_sessionManager) {
    lua.multiplayer_sessionManager.cancelJoiningSession()
  } else {
    console.error("multiplayer_sessionManager not found")
  }
}
</script>

<style lang="scss" scoped>
button {
  pointer-events: all !important;
  background-color: var(--bng-orange);
  color: var(--bng-off-white);
  border: none;
  padding: 0.5em 1em;
  border-radius: 0.25em;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background-color: red;
}
</style>