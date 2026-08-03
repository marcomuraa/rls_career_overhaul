<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p></p>

    <div class="demo-1-container">
      <BngCard v-bng-scoped-nav="{ scopeId: 'scope1' }" class="scoped-nav-card">
        <BngCardHeading>Scope 1</BngCardHeading>
        <p>Press button with <BngBinding ui-event="ok" /> to switch to Scope 2</p>
        <BngButton v-bng-on-ui-nav:ok.asMouse.focusRequired @click="switchScope">
          Switch to Scope 2
          <BngBinding ui-event="ok" controller />
        </BngButton>
      </BngCard>

      <BngCard v-bng-scoped-nav="{ scopeId: 'scope2' }" class="scoped-nav-card">
        <BngCardHeading>Scope 2</BngCardHeading>
        <BngButton v-bng-on-ui-nav:context="switchScope">
          Switch to Scope 1
          <BngBinding ui-event="context" controller />
        </BngButton>
      </BngCard>
    </div>

    <BngDivider></BngDivider>
  </div>
</template>

<script setup>
import { BngButton, BngCard, BngCardHeading, BngDivider, BngBinding } from "@/common/components/base"
import { vBngOnUiNav, vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"
import { useScopedNav } from "@/services/scopedNav/api"

const infobar = useInfoBar()
infobar.visible = true

const scopedNav = useScopedNav()
function switchScope() {
  const currentScope = scopedNav.currentScope()
  console.log("switchScope", currentScope)
  if (!currentScope || currentScope.id === "scope2") {
    scopedNav.switchScope("scope1")
  } else {
    scopedNav.switchScope("scope2")
  }
}
</script>

<style lang="scss" scoped>
.root-container {
  overflow-y: auto;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 1);
  color: white;
  margin-bottom: 5rem;
  width: 100%;

  .divider {
    margin: 1rem 0;
  }
}

.demo-1-container {
  display: flex;
  width: 100%;

  > * {
    width: 50%;
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
