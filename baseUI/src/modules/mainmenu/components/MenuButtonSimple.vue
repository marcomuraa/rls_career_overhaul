<template>
  <Button class="menu-button-simple" :class="[accent]" :sound-class="soundClass" v-bng-blur="!bgRequired">
    <template #prebackground>
      <BlurBackground v-if="bgRequired" />
    </template>
    <template #prefix v-if="icon">
      <BngIcon :type="icon" :color="iconColor" />
    </template>
    <div class="btn-content" :class="{ 'with-subtext': slots.subtext }">
      <span class="label"><slot></slot></span>
      <span class="small" v-if="slots.subtext"><slot name="subtext"></slot></span>
    </div>
  </Button>
</template>

<script setup>
import { useSlots } from "vue"
import { BngIcon, icons } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngBlur } from "@/common/directives"
import BlurBackground from "@/common/modules/main-bg/components/BlurBackground.vue"
import { SysInfo } from "@/services"

const bgRequired = SysInfo.mainMenuBackgroundRequired

const slots = useSlots()

defineProps({
  icon: Object,
  iconColor: String,
  accent: String,
  soundClass: String,
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.menu-button-simple {
  font-size: calc-ui-rem();
  min-height: 3em;
  pointer-events: all;

  --bng-bg-enabled: var(--bng-off-black);
  --bng-bg-enabled-opacity: 0.4;
  --bng-bg-hover: var(--bng-orange-600);
  --bng-bg-hover-opacity: 0.6;
  --bng-bg-active: var(--bng-off-black);
  --bng-bg-active-opacity: 1;
  --bng-bg-disabled: var(--bng-off-black);
  --bng-bg-disabled-opacity: 0.4;

  &.danger {
    position: relative;
    $color: var(--bng-add-red-600-rgb);
    $color-solid: var(--bng-add-red-600);
    box-shadow: inset 0 0 0 calc-ui-rem(0.125) $color-solid;
    --bng-bg-hover: var(--bng-off-black);
    --bng-bg-image: #{
      linear-gradient(-45deg, rgba($color, 0) calc(50% - 0.124em), $color-solid calc(50% - 0.125em), $color-solid calc(50% + 0.125em), rgba($color, 0) calc(50% + 0.126em)),
      linear-gradient(90deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.4) 30%, rgba(0, 0, 0, 0.00) 50%, rgba(0, 0, 0, 0.4) 70%, rgba(0, 0, 0, 0.7) 100%),
      repeating-linear-gradient(-45deg, rgba($color, 0), rgba($color, 0) 0.424em, rgba($color, 0.8) 0.425em, rgba($color, 0.8) 0.55em)
    };
    --bng-bg-border-enabled: #{$color-solid};
    --bng-bg-border-hover: #{$color-solid};
    --bng-bg-border-active: #{$color-solid};
    --bng-bg-border-disabled: #{$color-solid};
  }

  &.red {
    --bng-bg-enabled: var(--bng-add-red-600);
    --bng-bg-enabled-opacity: 0.6;
    --bng-bg-hover: var(--bng-add-red-500);
    --bng-bg-hover-opacity: 1;
    --bng-bg-active: var(--bng-add-red-700);
    --bng-bg-active-opacity: 1;
    --bng-bg-disabled: var(--bng-add-red-700);
    --bng-bg-disabled-opacity: 0.5;
  }
}

.btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.2em;

  &.with-subtext {
    .label,
    .small {
      line-height: 1.2;
    }
    .small {
      font-size: 0.8em;
    }
  }
}
</style>
