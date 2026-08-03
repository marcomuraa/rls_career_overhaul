<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>Add handlers for <code>@activate</code>, <code>@deactivate</code>, and <code>@suspend</code> events to listen for the scope's lifecycle update.</p>
    <BngCard
      v-bng-scoped-nav
      @activate="eventsExampleScopeChanged"
      @deactivate="eventsExampleScopeChanged"
      @suspend="eventsExampleScopeChanged"
      @resume="eventsExampleScopeChanged">
      <BngCardHeading>Events Example</BngCardHeading>
      <p>Scope Active: {{ eventsExampleScopeActive }}</p>
      <BngButton @click="() => sayHello('Button 1.1 click', e)"> Button 1 </BngButton>
      <BngButton v-bng-on-ui-nav:context.asMouse @click="() => sayHello('Events Example Button 2', e)">Button 2</BngButton>
      <BngButton v-bng-on-ui-nav:action_2.asMouse @click="() => sayHello('Events Example Button 3', e)">Button 3</BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngCard, BngCardHeading } from "@/common/components/base"
import { vBngUiNavScroll, vBngScopedNav, vBngOnUiNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

function sayHello(name, event, returnValue = true) {
  const msg = `Hello, ${name}!`
  console.log(msg, event)
  return returnValue
}

const eventsExampleScopeActive = ref(false)
function eventsExampleScopeChanged(e) {
  console.log("eventsExampleScopeChanged", e)
  eventsExampleScopeActive.value = e.type === "activate"
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
