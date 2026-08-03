<template>
  <div class="root-container">
    <p>This demo toggles between two buttons to trigger re-renders. The scoped navigation should keep working and focus a navigable child after each update.</p>

    <BngCard v-bng-scoped-nav>
      <BngCardHeading>Conditional Buttons</BngCardHeading>
      <BngButton v-if="showFirst" @click="toggle()">First Button (click to toggle)</BngButton>
      <BngButton v-else @click="toggle()">Second Button (click to toggle)</BngButton>
    </BngCard>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { BngButton, BngCard, BngCardHeading } from "@/common/components/base"
import { vBngScopedNav } from "@/common/directives"
import { useInfoBar } from "@/services/infoBar.js"

const infobar = useInfoBar()
infobar.visible = true

const showFirst = ref(true)

function toggle() {
  showFirst.value = !showFirst.value
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
</style>
