<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>
      When a user navigates to a card and presses the "A" button, the focus frame is trapped within the card. The screen appearance remains unchanged, but
      elements inside the card become selectable. This allows users to interact with elements that do not have specific keybindings.
    </p>

    <BngCard v-bng-scoped-nav>
      <BngCardHeading>Basic Example</BngCardHeading>
      <BngInput />
      <BngButton v-bng-on-ui-nav:ok.focusRequired="e => sayHello('Button 1.1', e)" @click="() => sayHello('Button 1.1 click', e)">Button 1.1</BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p>
      Container type allows(by default unless <code>open</code> is set to false) navigation towards its child elements. If any of its child elements are
      focused, the scope will be activated, and none of its child elements are focused and is not the active element, the scope will be deactivated.
    </p>
    <BngCard v-bng-scoped-nav="{ type: 'container' }">
      <BngCardHeading>Container Type</BngCardHeading>
      <BngButton @click="() => sayHello('[Container Type] Button 1 click', e)">Button 1</BngButton>
      <BngButton @click="() => sayHello('[Container Type] Button 2 click', e)">Button 2</BngButton>
      <BngButton @click="() => sayHello('[Container Type] Button 3 click', e)">Button 3</BngButton>
    </BngCard>
  </div>
</template>

<script setup>
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
