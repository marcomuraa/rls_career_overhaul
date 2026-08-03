<template>
  <div v-bng-ui-nav-scroll v-bng-on-ui-nav:context="onContextToggle" class="root-container">
    <p>
      The <code>activated</code> setting is reactive. Toggling it will activate or deactivate the scoped navigation. Press <BngBinding ui-event="context" />
      while the card is focused to toggle.
    </p>

    <BngCard v-bng-scoped-nav="{ activated, bubbleWhitelistEvents: ['context'] }" class="scoped-nav-card">
      <BngCardHeading>activated: {{ activated }} <BngBinding ui-event="context" controller /></BngCardHeading>
      <p>Focus on card then press <BngBinding ui-event="context" /> to toggle.</p>
      <BngButton @click="() => sayHello('Button 1 click')">Button 1</BngButton>
      <BngButton @click="() => sayHello('Button 2 click')">Button 2</BngButton>
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

const activated = ref(false)

function onContextToggle() {
  activated.value = !activated.value
}

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
  margin: 1rem 0;
}
</style>
