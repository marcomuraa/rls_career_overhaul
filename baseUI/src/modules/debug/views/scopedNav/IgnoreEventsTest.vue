<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p></p>

    <BngCard v-bng-scoped-nav="{ canIgnoreEvent }">
      <BngCardHeading>Ignore Events</BngCardHeading>
      <p>Click Button 1 or press with <BngBinding ui-event="ok" /> to toggle flag to ignore <BngBinding ui-event="context" /></p>
      <p>Ignore flag: {{ ignoreEvent }}</p>
      <BngButton v-bng-on-ui-nav:context="e => sayHello('[Ignore Events] Button 1', e)" @click="toggleIgnoreEvent">
        Button 1
        <BngBinding ui-event="context" controller />
      </BngButton>
      <BngButton> Button 2 </BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngCard, BngCardHeading, BngBinding } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

function sayHello(name, event, returnValue = true) {
  const msg = `Hello, ${name}!`
  console.log(msg, event)
  return returnValue
}

const ignoreEvent = ref(false)
function toggleIgnoreEvent() {
  ignoreEvent.value = !ignoreEvent.value
}

function canIgnoreEvent(event) {
  const ignorableEvents = ["context", "action_2"]
  const eventName = event.detail.name

  if (ignorableEvents.includes(eventName)) {
    return ignoreEvent.value
  }

  // Return false for the rest of the events for this example
  // so that crossfire events won't be ignored (i.e. focus_u, focus_d, focus_l, focus_r, ok, back)
  return false
}
</script>

<style lang="scss" scoped>
.root-container {
  overflow-y: auto;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 1);
  color: white;
  margin-bottom: 5rem;

  .divider {
    margin: 1rem 0;
  }
}

.root-container > :deep(.bng-card) {
  &[data-bng-scoped-nav-state="active"] {
    background: green;
  }
  &[data-bng-scoped-nav-state="inactive"] {
    background: grey;
  }
  &[data-bng-scoped-nav-state="suspended"] {
    background: yellow;
  }
}

.scoped-nav-card {
  .passthrough-label {
    display: none;
  }
  &[data-bng-scoped-nav-passthrough="true"] {
    background: yellow !important;

    .passthrough-label {
      display: inline;
    }
  }
}
</style>
