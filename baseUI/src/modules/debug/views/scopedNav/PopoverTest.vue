<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>
      Popover scoped navigation uses a dedicated scope that activates when the popover contains navigable items. These demos show behavior when the
      popover is standalone and when it is nested inside another scoped navigation container.
    </p>

    <!-- 1) Standalone: click handlers inside popover -->
    <BngCard>
      <BngCardHeading>Standalone Popover — Click Buttons</BngCardHeading>
      <BngButton v-bng-popover:right.click="'demo-popover-a'">Open Popover A</BngButton>

      <BngPopoverContent name="demo-popover-a">
        <template #default>
          <div class="popover-content">
            <BngButton @click="e => sayHello('[A] Button 1', e)">Button 1</BngButton>
            <BngButton @click="e => sayHello('[A] Button 2', e)">Button 2</BngButton>
            <BngButton @click="e => sayHello('[A] Button 3', e)">Button 3</BngButton>
          </div>
        </template>
      </BngPopoverContent>
    </BngCard>

    <BngDivider></BngDivider>

    <!-- 2) Standalone: UINav handlers inside popover -->
    <BngCard>
      <BngCardHeading>Standalone Popover — UINav Handlers</BngCardHeading>
      <BngButton v-bng-popover:left.click="'demo-popover-b'">Open Popover B</BngButton>

      <BngPopoverContent name="demo-popover-b">
        <template #default>
          <div class="popover-content">
            <BngButton v-bng-on-ui-nav:action_2="e => sayHello('[B] action_2', e)">
              Action 2 <BngBinding ui-event="action_2" controller />
            </BngButton>
            <BngButton v-bng-on-ui-nav:context="e => sayHello('[B] context', e)">
              Context <BngBinding ui-event="context" controller />
            </BngButton>
            <BngButton v-bng-on-ui-nav:menu="e => sayHello('[B] menu', e)">
              Menu <BngBinding ui-event="menu" controller />
            </BngButton>
          </div>
        </template>
      </BngPopoverContent>
    </BngCard>

    <BngDivider></BngDivider>

    <!-- 3) Nested: within a scoped-nav card, click handlers inside popover -->
    <BngCard v-bng-scoped-nav class="scoped-nav-card">
      <BngCardHeading>Nested in ScopedNav — Click Buttons</BngCardHeading>
      <BngButton v-bng-popover:right.click="'demo-popover-c'">Open Popover C</BngButton>

      <BngPopoverContent name="demo-popover-c">
        <template #default>
          <div class="popover-content">
            <BngButton @click="e => sayHello('[C] Button 1', e)">Button 1</BngButton>
            <BngButton @click="e => sayHello('[C] Button 2', e)">Button 2</BngButton>
            <BngButton @click="e => sayHello('[C] Button 3', e)">Button 3</BngButton>
          </div>
        </template>
      </BngPopoverContent>
    </BngCard>

    <BngDivider></BngDivider>

    <!-- 4) Nested: within a scoped-nav card, UINav handlers inside popover -->
    <BngCard v-bng-scoped-nav class="scoped-nav-card">
      <BngCardHeading>Nested in ScopedNav — UINav Handlers</BngCardHeading>
      <BngButton v-bng-popover:left.click="'demo-popover-d'">Open Popover D</BngButton>

      <BngPopoverContent name="demo-popover-d">
        <template #default>
          <div class="popover-content">
            <BngButton v-bng-on-ui-nav:action_2="e => sayHello('[D] action_2', e)">
              Action 2 <BngBinding ui-event="action_2" controller />
            </BngButton>
            <BngButton v-bng-on-ui-nav:context="e => sayHello('[D] context', e)">
              Context <BngBinding ui-event="context" controller />
            </BngButton>
            <BngButton v-bng-on-ui-nav:menu="e => sayHello('[D] menu', e)">
              Menu <BngBinding ui-event="menu" controller />
            </BngButton>
          </div>
        </template>
      </BngPopoverContent>
    </BngCard>
  </div>

</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, BngDivider, BngBinding, BngPopoverContent } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavScroll, vBngScopedNav, vBngPopover } from "@/common/directives"
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
  margin: 1rem 0;

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

.popover-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>


