<template>
  <div class="toast-host" aria-live="polite" aria-relevant="additions removals">
    <TransitionGroup name="toast-list" tag="div" class="toast-host__list">
      <ToastItem v-for="toast in toastsView.items" :key="toast.id" :toast="toast" />
    </TransitionGroup>
  </div>
</template>

<script setup>
import { toastsView } from "@/services/toast"
import ToastItem from "../components/ToastItem.vue"
</script>

<style lang="scss" scoped>
@use "@/styles/modules/variables/z-index" as *;

.toast-host {
  position: fixed;
  inset: 0;
  z-index: $toast;
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: none;
}

.toast-host__list {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 0.65rem;
}

.toast-list-enter-active,
.toast-list-leave-active,
.toast-list-move {
  transition: opacity 180ms ease, transform 180ms ease;
}

.toast-list-enter-from,
.toast-list-leave-to {
  opacity: 0;
  transform: translateX(1.5rem);
}

.toast-list-leave-active {
  position: absolute;
  right: 1.5rem;
}
</style>
