<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>
      Use the canActivate and canDeactivate guards to control whether the scope can be activated or deactivated when using a controller. Some forced activation
      or deactivation can happen due to vue lifecycle events or when using mouse click which changes the active element.
    </p>

    <BngButton @click="toggleCanActivate">canActivate({{ canActivateEnabled }})</BngButton>
    <BngButton @click="toggleCanDeactivate">canDeactivate({{ canDeactivateEnabled }})</BngButton>

    <BngCard v-bng-scoped-nav="{ canActivate, canDeactivate }">
      <BngCardHeading>Basic Example</BngCardHeading>
      <BngInput />
      <BngButton v-bng-on-ui-nav:ok.focusRequired="e => sayHello('Button 1.1', e)" @click="() => sayHello('Button 1.1 click', e)">Button 1.1</BngButton>
    </BngCard>

    <BngDivider></BngDivider>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngCard, BngCardHeading, BngDivider, BngInput } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

function sayHello(name, event, returnValue = true) {
  const msg = `Hello, ${name}!`
  console.log(msg, event)
  return returnValue
}

const canActivateEnabled = ref(true)
function toggleCanActivate() {
  canActivateEnabled.value = !canActivateEnabled.value
}

const canDeactivateEnabled = ref(true)
function toggleCanDeactivate() {
  canDeactivateEnabled.value = !canDeactivateEnabled.value
}

function canActivate() {
  return canActivateEnabled.value
}

function canDeactivate() {
  return canDeactivateEnabled.value
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
