<template>
  <div>
    <h3>Basic Usage</h3>
    <p>The Background component is designed to be absolutely positioned within a relative container. It handles states like hover, active, and disabled automatically based on the parent's state.</p>

    <div class="demo-row">
      <!-- Basic Container -->
      <div class="demo-box">
        <span class="content">Default (Transparent)</span>
        <Background />
      </div>

      <!-- Custom Colors -->
      <div class="demo-box custom-colors">
        <span class="content">Custom Colors</span>
        <Background />
      </div>

      <!-- With Image -->
      <div class="demo-box custom-image">
        <span class="content">With Image</span>
        <Background />
      </div>

      <!-- Disabled State -->
      <button class="demo-box custom-colors" disabled>
        <span class="content">Disabled Parent</span>
        <Background />
      </button>
    </div>

    <h3>Z-Index Isolation</h3>
    <p>Since the background has z-index: -1, the parent should establish a stacking context (e.g. isolation: isolate) if you want the background to stay within the component and not go behind the parent's background if the parent has one.</p>

    <div class="demo-row">
      <div class="demo-box isolation-example">
        <span class="content" style="z-index: 1; position: relative;">Content above</span>
        <Background />
      </div>
    </div>
  </div>
</template>

<script setup>
import { Background } from "@/common/components/utility"
</script>

<style lang="scss" scoped>
.demo-row {
  display: flex;
  gap: 1em;
  flex-wrap: wrap;
  margin-bottom: 2em;
}

.demo-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 80px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  isolation: isolate; // Important for z-index: -1 child
  
  // Reset button styles for the button example
  background: none;
  padding: 0;
  color: inherit;
  font: inherit;

  .content {
    z-index: 1;
  }
}

.custom-colors {
  --bng-bg-enabled: rgba(0, 128, 255, 0.2);
  --bng-bg-hover: rgba(0, 128, 255, 0.4);
  --bng-bg-active: rgba(0, 128, 255, 0.6);
  --bng-bg-border-enabled: rgba(0, 128, 255, 0.5);
  --bng-bg-border-width: 2px;
  --bng-bg-border-radius: 8px;
  
  // Disabled state vars
  --bng-bg-disabled: rgba(128, 128, 128, 0.2);
  --bng-bg-border-disabled: rgba(128, 128, 128, 0.4);
}

.custom-image {
  --bng-bg-image: linear-gradient(45deg, #ff000040, #0000ff40);
  --bng-bg-hover: rgba(255, 255, 255, 0.1);
  --bng-bg-border-radius: 12px;
}

.isolation-example {
  background-color: #333; // Parent background
  --bng-bg-enabled: rgba(255, 0, 0, 0.5); // Child background
}
</style>

<script>
import source from "./background_demo.vue?raw"

export default {
  source,
  title: "Utility Background",
  description: "A standalone background component that handles state changes (hover, active, disabled) via CSS variables.",
  propInfo: [],
}
</script>
