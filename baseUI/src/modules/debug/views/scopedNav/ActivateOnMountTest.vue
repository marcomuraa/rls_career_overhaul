<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>
      When <code>activateOnMount</code> is set to true, the scope will automatically activate once the component is mounted. This example binds the directive
      to a ref object.
    </p>

    <BngCard v-bng-scoped-nav="settingsRef">
      <BngCardHeading>activateOnMount: true (ref)</BngCardHeading>
      <BngButton @click="() => sayHello('Button 1 click', e)">Button 1</BngButton>
      <BngButton @click="() => sayHello('Button 2 click', e)">Button 2</BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p>Current settings:</p>
    <pre class="settings-preview">{{ settingsRef }}</pre>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngCard, BngCardHeading, BngDivider } from "@/common/components/base"
import { vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

// Use a ref object for the directive binding
const settingsRef = ref({
  activateOnMount: true,
})

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

.settings-preview {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.5rem;
  border-radius: var(--bng-corners-1);
}
</style>


