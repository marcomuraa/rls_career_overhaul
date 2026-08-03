<template>
  <div v-bng-ui-nav-scroll class="root-container">
    <p>
      <code>canPreventNavigationEscape</code> is a function-based alternative to the static <code>preventNavigationEscape</code> array.
      It receives the escape direction and event, returning <code>true</code> to trap or <code>false</code> to allow escape.
      Toggle the checkboxes below to change which directions are blocked at runtime.
    </p>

    <div class="toggle-row">
      <label v-for="dir in allDirections" :key="dir" class="toggle-label">
        <input type="checkbox" :checked="blockedDirections.has(dir)" @change="toggleDirection(dir)" />
        {{ dir }}
      </label>
    </div>

    <BngDivider />

    <BngCard v-bng-scoped-nav="{ type: 'container', canPreventNavigationEscape: guardEscape }" class="scoped-nav-card">
      <BngCardHeading>Dynamic Escape Guard</BngCardHeading>
      <div class="button-grid">
        <BngButton>Top-Left</BngButton>
        <BngButton>Top-Right</BngButton>
        <BngButton>Bottom-Left</BngButton>
        <BngButton>Bottom-Right</BngButton>
      </div>
    </BngCard>

    <BngDivider />

    <BngCard v-bng-scoped-nav="{ type: 'container', preventNavigationEscape: ['left', 'right'] }" class="scoped-nav-card">
      <BngCardHeading>Static preventNavigationEscape (left, right)</BngCardHeading>
      <BngButton>Button 1</BngButton>
      <BngButton>Button 2</BngButton>
      <BngButton>Button 3</BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { reactive } from "vue"
import { BngButton, BngCard, BngCardHeading, BngDivider } from "@/common/components/base"
import { vBngUiNavScroll, vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

const allDirections = ["top", "bottom", "left", "right"]
const blockedDirections = reactive(new Set(["left", "right"]))

function toggleDirection(dir) {
  if (blockedDirections.has(dir)) blockedDirections.delete(dir)
  else blockedDirections.add(dir)
}

function guardEscape(direction) {
  return blockedDirections.has(direction)
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

.toggle-row {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

.button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
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
