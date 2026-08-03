<template>
  <div
    v-bng-ui-nav-scroll
    class="root-container"
    v-bng-on-ui-nav:context="e => sayHello('Received bubbled event', e)"
    v-bng-on-ui-nav:action_2="e => sayHello('Received bubbled event', e)">
    <p>
      <code>bubbleWhitelistEvents</code> allows you to whitelist events that are allowed to bubble up to the parent scope or to the global handler.
      <code>action_2</code> will be bubbled up to the parent div.
    </p>

    <BngCard v-bng-scoped-nav="{ bubbleWhitelistEvents: ['context', 'action_2'] }">
      <BngCardHeading>Bubble Whitelist Events</BngCardHeading>
      <p><BngBinding ui-event="context" /> is whitelisted but <code>context</code> handler returns false so it will not bubble up to the parent div.</p>
      <BngButton v-bng-on-ui-nav:context="e => sayHello('[Bubble Whitelist Events] Button 1', e)">
        Button 1
        <BngBinding ui-event="context" controller />
      </BngButton>
      <BngButton> Button 2 </BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p>
      If a handler exists for the UINav event and you want that event to still bubble up to the parent div, set the return value of the handler to true. In this
      example, set the button 1's <code>context</code> handler to return true so that it will bubble up to the parent div.
    </p>

    <BngCard v-bng-scoped-nav="{ bubbleWhitelistEvents: ['context', 'action_2'] }">
      <BngCardHeading>Handler Return Value</BngCardHeading>
      <p><BngBinding ui-event="context" /> will bubble up to the parent div.</p>
      <BngButton v-bng-on-ui-nav:context="e => sayHello('[Handler Return Value] Button 1', e, true)">
        Button 1
        <BngBinding ui-event="context" controller />
      </BngButton>
      <BngButton> Button 2 </BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p>
      <code>canBubbleEvent</code> is a guard function that allows you to control whether an event should bubble up to the parent scope or to the global handler.
      Use this instead of <code>bubbleWhitelistEvents</code> when you need more control over the event bubbling.
    </p>

    <BngCard v-bng-scoped-nav="{ canBubbleEvent }">
      <BngCardHeading>canBubbleEvent</BngCardHeading>
      <p><BngBinding ui-event="context" /> will bubble up to the parent div.</p>
      <BngButton> Button 1 </BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, BngDivider, BngBinding } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

function sayHello(name, event, returnValue = false) {
  const msg = `${name}: ${event.detail.name}`
  console.log(msg, event)
  return returnValue
}

function canBubbleEvent(event) {
  return event.detail.name === "context"
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
