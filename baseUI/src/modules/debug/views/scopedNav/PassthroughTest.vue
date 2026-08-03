<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>
      Passthrough is enabled if no UINav events are bound to more than one element and all navigable items are bound to a UINav event. Element attribute
      <code>data-bng-scoped-nav-passthrough</code> will be set to true passthrough is enabled for the scoped nav element.
    </p>
    <BngCard v-bng-scoped-nav class="scoped-nav-card">
      <BngCardHeading>Passthrough Allowed Example <span class="passthrough-label">Passthrough Enabled</span></BngCardHeading>
      <BngButton v-bng-on-ui-nav:context="() => sayHello('[Passthrough Allowed Example] Button 1', e)">
        Button 1 <BngBinding ui-event="context" controller />
      </BngButton>
      <BngButton v-bng-on-ui-nav:action_2="() => sayHello('[Passthrough Allowed Example] Button 2', e)">
        Button 2 <BngBinding ui-event="action_2" controller />
      </BngButton>
      <BngButton v-bng-on-ui-nav:menu="() => sayHello('[Passthrough Allowed Example] Button 3', e)">
        Button 3 <BngBinding ui-event="menu" controller />
      </BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p>Passthrough will not be enabled if any UINav events are bound to the same element.</p>
    <BngCard v-bng-scoped-nav class="scoped-nav-card">
      <BngCardHeading>Duplicate UINav Events Bound to the Same Element</BngCardHeading>
      <BngButton v-bng-on-ui-nav:action_2.focusRequired="() => sayHello('[Duplicate UINav Events Bound to the Same Element] Button 1', e)">
        Button 1
      </BngButton>
      <BngButton v-bng-on-ui-nav:action_2.focusRequired="() => sayHello('[Duplicate UINav Events Bound to the Same Element] Button 2', e)">
        Button 2
      </BngButton>
      <BngButton v-bng-on-ui-nav:context="() => sayHello('[Duplicate UINav Events Bound to the Same Element] Button 3', e)">Button 3</BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p>All navigable items must be bound to a UINav event so that the ScopedNav is enabled.</p>

    <BngCard v-bng-scoped-nav class="scoped-nav-card">
      <BngCardHeading>Not All Bound</BngCardHeading>
      <BngButton @click="() => sayHello('[Duplicate Actions Bound to the Same Element] Button 1', e)">Button 1</BngButton>
      <BngButton v-bng-on-ui-nav:action_2.focusRequired="() => sayHello('[Duplicate Actions Bound to the Same Element] Button 2', e)">Button 2</BngButton>
      <BngButton v-bng-on-ui-nav:context="() => sayHello('[Duplicate Actions Bound to the Same Element] Button 3', e)">Button 3</BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, BngBinding } from "@/common/components/base"
import { vBngUiNavScroll, vBngScopedNav, vBngOnUiNav } from "@/common/directives"
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
  .passthrough-label {
    display: none;
  }

  &[data-bng-scoped-nav-passthrough="true"] {
    .passthrough-label {
      display: inline !important;
      color: green;
    }
  }

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
