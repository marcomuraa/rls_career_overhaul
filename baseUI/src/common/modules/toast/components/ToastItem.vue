<template>
  <article
    :class="[
      'toast-item',
      `toast-item--${toast.type}`,
      {
        'toast-item--clickable': clickable,
        'toast-item--has-title': !!toast.title,
      },
    ]"
    :role="clickable ? 'button' : 'status'"
    :tabindex="clickable ? 0 : undefined"
    @click="onActivate"
    @keydown.enter.prevent="onActivate"
    @keydown.space.prevent="onActivate"
    @mouseenter="pauseToast(toast.id)"
    @mouseleave="onMouseLeave"
  >
    <div class="toast-item__content">
      <div v-if="toast.title" class="toast-item__title">
        <DynamicComponent :template="toast.title" bbcode />
      </div>
      <div
        v-if="toast.message"
        :class="['toast-item__message', { 'toast-item__message--with-progress': toast.progressBar && toast.timeout > 0 }]"
      >
        <DynamicComponent :template="toast.message" bbcode />
      </div>
    </div>
    <BngButton
      v-if="toast.closeButton"
      class="toast-item__close"
      accent="text"
      bng-no-nav="true"
      tabindex="-1"
      aria-label="Dismiss"
      @click.stop="dismissToast(toast.id)"
    ><BngIcon :type="icons.abandon" /></BngButton>
    <div
      v-if="toast.progressBar && toast.timeout > 0"
      :key="toast.progressKey"
      :class="['toast-item__progress', { 'toast-item__progress--paused': toast.paused }]"
      :style="{ animationDuration: `${toast.timeout}ms` }"
    />
  </article>
</template>

<script setup>
import { computed } from "vue"
import { BngButton, BngIcon, icons } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { activateToast, dismissToast, pauseToast, resumeToast } from "@/services/toast"

const props = defineProps({
  toast: {
    type: Object,
    required: true,
  },
})

const clickable = computed(() => typeof props.toast.onClick === "function")
const onActivate = () => clickable.value && activateToast(props.toast.id)

function onMouseLeave(event) {
  const article = event.currentTarget
  const next = event.relatedTarget
  if (next && article.contains(next)) return
  requestAnimationFrame(() => {
    if (article.matches(":hover")) return
    resumeToast(props.toast.id)
  })
}
</script>

<style lang="scss">
.toast-item {
  --toast-accent: var(--bng-ter-blue-gray-400);

  position: relative;
  display: flex;
  width: min(28rem, calc(100vw - 3rem));
  min-height: 4rem;
  max-height: min(25rem, calc(100vh - 5rem));
  color: var(--bng-off-white);
  background:
    linear-gradient(
      90deg,
      var(--toast-accent) 0 0.375rem,
      color-mix(in srgb, var(--toast-accent) 40%, transparent) 0.375rem,
      transparent 60%
    ),
    var(--bng-cool-gray-800);
  border-radius: var(--bng-corners-2);
  box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 45%);
  overflow: hidden;
  pointer-events: auto;

  &--success {
    --toast-accent: var(--bng-add-green-400);
  }

  &--warning {
    --toast-accent: var(--bng-orange-400);
  }

  &--error {
    --toast-accent: var(--bng-add-red-500);
  }

  &--clickable {
    cursor: pointer;
  }

  &--has-title {
    .toast-item__content {
      padding-right: 0.5rem;
    }

    .toast-item__title {
      min-height: 2.25rem;
      padding-right: 2.25rem;
    }

    .toast-item__message {
      padding-right: 0.5rem;
    }

    .toast-item__close {
      position: absolute;
      top: 0.25rem;
      right: 0.25rem;
      z-index: 1;
    }
  }
}

.toast-item__content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.8rem 1rem;
}

.toast-item__title {
  flex: 0 0 auto;
  font-size: 1.05rem;
  font-weight: 700;
}

.toast-item__message {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 0.2rem;
  color: var(--bng-cool-gray-100);
  font-size: 1rem;
  line-height: 1.4;

  &--with-progress {
    padding-bottom: 0.3rem;
  }
}

.toast-item__close {
  --bng-button-min-width: 0;
  --bng-button-padding: 0.25rem;

  align-self: flex-start;
  flex: 0 0 auto;
  width: 2rem;
  min-width: 0;
  margin: 0.25rem;
}

.toast-item__progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 0.2rem;
  background: var(--toast-accent);
  transform-origin: left;
  animation-name: toast-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;

  &--paused {
    animation-play-state: paused;
  }
}

@keyframes toast-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
