<template>
  <div class="flat-file-browser-row-content">
    <div class="main">
      <BngIcon v-if="item.icon" class="icon" :type="item.icon" />
      <div class="text">
        <span class="label">{{ item.label }}</span>
        <span v-if="item.subtitle" class="subtitle">{{ item.subtitle }}</span>
        <span v-if="item.disabled && item.disabledReason" class="disabled-reason">{{ item.disabledReason }}</span>
      </div>
    </div>

    <div v-if="active && visibleActions.length" class="actions">
      <Button
        v-for="action in visibleActions"
        :key="action.key"
        v-bng-tooltip:top="action.showLabel === false ? action.label : undefined"
        type="button"
        class="action"
        :class="{ 'is-danger': action.danger }"
        :disabled="item.disabled || action.disabled"
        :title="action.label"
        tabindex="-1"
        @click.stop="emit('action', action)"
      >
        <BngBinding
          v-if="action.uiEvent"
          class="binding"
          :ui-event="action.uiEvent"
          controller
          track-ignore
        />
        <BngIcon v-if="action.icon" class="action-icon" :type="action.icon" />
        <span v-if="action.showLabel !== false" class="action-label">{{ action.label }}</span>
      </Button>
    </div>
  </div>
</template>

<script setup>
import { BngBinding, BngIcon } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngTooltip } from "@/common/directives"

defineProps({
  item: {
    type: Object,
    required: true,
  },
  active: Boolean,
  visibleActions: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(["action"])
</script>

<style lang="scss" scoped>
.flat-file-browser-row-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.75rem;
  min-width: 0;
  min-height: 1.75rem;
  .main {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    gap: 0.5rem;
    min-width: 0;
    overflow: hidden;
  }

  .icon {
    --bng-icon-size: 1.5em;
    --bng-icon-color: var(--bng-off-white);

    flex: 0 0 auto;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .label,
  .subtitle,
  .disabled-reason,
  .action-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .label {
    color: var(--bng-off-white);
    font-weight: 600;
  }

  .subtitle,
  .disabled-reason {
    color: var(--bng-cool-gray-200);
    font-size: 0.85em;
  }

  .actions {
    display: flex;
    align-items: stretch;
    align-self: stretch;
    justify-content: flex-end;
    flex: 0 0 auto;
    gap: 0.25em;
  }

  .action {
    --bng-icon-color: currentColor;
    --bng-bg-image: none;

    --bng-bg-enabled: var(--bng-off-black);
    --bng-bg-enabled-opacity: 0.25;
    --bng-bg-hover: var(--bng-cool-gray-750);
    --bng-bg-hover-opacity: 1;
    --bng-bg-active: var(--bng-cool-gray-900);
    --bng-bg-active-opacity: 1;
    --bng-bg-disabled: var(--bng-off-black);
    --bng-bg-disabled-opacity: 0.1;
    --bng-bg-focus-opacity: 0.5;

    --bng-bg-border-width: 0;
    --bng-bg-border-radius: var(--bng-corners-1);

    --bng-button-margin: 0;

    --bng-button-text-enabled-color: currentColor;
    --bng-button-text-hover-color: currentColor;
    --bng-button-text-active-color: currentColor;
    --bng-button-text-disabled-color: currentColor;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    min-width: 0;
    max-width: 10rem;
    padding: 0.25em 0.5em;
    font: inherit;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: default;
    }

    &.is-danger {
      --bng-bg-hover: var(--bng-add-red-600);
      --bng-bg-active: var(--bng-add-red-800);
      --bng-button-text-enabled-color: var(--bng-add-red-200);
      --bng-button-text-hover-color: var(--bng-off-white);
      --bng-button-text-active-color: var(--bng-off-white);
      --bng-button-text-disabled-color: var(--bng-off-white);
    }
  }

  .binding,
  .action-icon {
    flex: 0 0 auto;
  }
  .action-icon {
    --bng-icon-size: 1.25em;
  }
}
</style>
