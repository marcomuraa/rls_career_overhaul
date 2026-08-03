<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p></p>

    <BngCard v-bng-scoped-nav>
      <BngCardHeading>Normal Type with Auto-focus</BngCardHeading>
      <BngButton @click="() => sayHello('Button 1 click', e)">Button 1</BngButton>
      <BngButton bng-scoped-nav-autofocus @click="() => sayHello('Button 2 click', e)"> Button 2 (Auto-focused) </BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p><code>PreferAutoFocus</code> will always auto-focus the specified autofocus item on re-activate.</p>
    <BngCard v-bng-scoped-nav="{ preferAutoFocus: true }">
      <BngCardHeading>Prefer Auto-focus</BngCardHeading>
      <BngButton @click="() => sayHello('[Container Type] Button 1 click', e)">Button 1</BngButton>
      <BngButton bng-scoped-nav-autofocus @click="() => sayHello('[Container Type] Button 2 click', e)">Button 2 (Auto-focused)</BngButton>
      <BngButton @click="() => sayHello('[Container Type] Button 3 click', e)">Button 3</BngButton>
    </BngCard>

    <BngDivider></BngDivider>

    <p>
      On initial activation, the first navigable item will be auto-focused. After that, the last focused item before the scope was suspended or deactivated will
      be auto-focused on re-activate.
    </p>
    <BngCard v-bng-scoped-nav="{ type: 'container' }">
      <BngCardHeading>Container Type with Auto-focus</BngCardHeading>
      <BngButton @click="() => sayHello('[Container Type] Button 1 click', e)">Button 1</BngButton>
      <BngButton bng-scoped-nav-autofocus @click="() => sayHello('[Container Type] Button 2 click', e)">Button 2 (Auto-focused)</BngButton>
      <BngButton @click="() => sayHello('[Container Type] Button 3 click', e)">Button 3</BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, BngDivider } from "@/common/components/base"
import { vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
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
