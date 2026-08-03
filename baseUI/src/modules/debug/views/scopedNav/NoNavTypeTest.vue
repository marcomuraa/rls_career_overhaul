<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>
      Nonav type disallows any focus navigation within it. This is useful for components that will only be interactable via controller bindings or mouse clicks.
    </p>

    <BngCard v-bng-scoped-nav="{ activateOnMount: true, type: 'nonav' }" class="scoped-nav-card">
      <BngCardHeading>Nonav Type</BngCardHeading>
      <BngButton v-bng-on-ui-nav:context.asMouse @click="() => sayHello('[Nonav Type] Button 1 click', e)">
        Button 1 <BngBinding ui-event="context" controller />
      </BngButton>
      <BngButton v-bng-on-ui-nav:action_2.asMouse @click="() => sayHello('[Nonav Type] Button 2 click', e)">
        Button 2 <BngBinding ui-event="action_2" controller />
      </BngButton>
      <BngButton v-bng-on-ui-nav:menu.asMouse @click="() => sayHello('[Nonav Type] Button 3 click', e)">
        Button 3 <BngBinding ui-event="menu" controller />
      </BngButton>
    </BngCard>

    <BngDivider></BngDivider>
  </div>
</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, BngDivider, BngBinding } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

function sayHello(name, event, returnValue = true) {
  const msg = `Hello, ${name}!`
  console.log(msg, event)
  return returnValue
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

.scoped-nav-card {
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
</style>
