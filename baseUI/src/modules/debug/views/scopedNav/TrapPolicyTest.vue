<template>
  <div v-bng-on-ui-nav:menu="e => sayHello('Reached non-trapping and non-scoped navigation handler', e)" class="root-container">
    <p>
      By default, the scope will only trap events when the controller is active. If no controller is active, the scope will bubble up the events until it
      reaches a scoped navigation with a trap policy of "always" or until it reaches the global handler. An "always" trap policy will trap and process all
      events received by the scope.
    </p>

    <BngCard
      v-bng-scoped-nav="{ trapPolicy: SCOPE_TRAP_POLICIES.ALWAYS }"
      v-bng-on-ui-nav:menu="e => sayHello('[Parent Scope] menu event', e)"
      class="scoped-nav-card">
      <BngCardHeading>Parent Scope</BngCardHeading>
      <BngCard v-bng-scoped-nav class="scoped-nav-card">
        <BngCardHeading>Child Scope</BngCardHeading>
        <BngButton>Button B1</BngButton>
      </BngCard>
    </BngCard>

    <BngDivider></BngDivider>

    <BngCard v-bng-scoped-nav class="scoped-nav-card">
      <BngCardHeading>Default Trap Policy (Controller Only)</BngCardHeading>
      <p>Pressing <BngBinding ui-event="menu" /> will bubble up the event and reach the root container handler.</p>
      <BngButton>Button</BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, BngDivider, BngBinding } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { SCOPE_TRAP_POLICIES } from "@/services/scopedNav/types"
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
  margin: 1rem;

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
