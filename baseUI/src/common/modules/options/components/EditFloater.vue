<template>
  <div class="options-edit" :class="{ 'options-edit-selectable': selectable }">
    <BngIcon
      v-if="selectable"
      :type="selected ? icons.checkboxOn : icons.checkboxOff"
      class="options-edit-select"
      :class="{ selected }"
      @click.stop="emit('emit-edit-cmd', 'select')"
    />
    <BngIcon :type="icons.arrowLargeUp" @click.stop="emit('emit-edit-cmd', 'move', -1)" />
    <BngIcon :type="icons.edit" @click.stop="emit('emit-edit-cmd', 'edit')" v-bng-tooltip:right="'Edit'" />
    <BngIcon :type="icons.arrowLargeDown" @click.stop="emit('emit-edit-cmd', 'move', 1)" />
    <BngIcon v-if="noMenu" :type="icons.trashBin1" @click.stop="emit('emit-edit-cmd', 'remove')" v-bng-tooltip:right="'Remove'" />
    <BngIcon v-if="!noMenu" :type="icons.wrench" @click.stop="emit('edit-menu', $event.target)" />
  </div>
</template>

<script setup>
import { BngIcon, icons } from "@/common/components/base"
import { vBngTooltip } from "@/common/directives"

defineProps({
  clipItem: Object,
  noMenu: Boolean,
  selectable: Boolean,
  selected: Boolean,
})

const emit = defineEmits(["emit-edit-cmd", "edit-menu"])
</script>

<style lang="scss" scoped>
.options-edit {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  width: 4em;
  height: 100%;
  min-height: 3em;
  max-height: 4em;
  font-size: 0.6em;
  background-color: #0008;
  z-index: 1;
  > *:hover {
    --bng-icon-color: #f60;
    cursor: pointer;
    z-index: 100;
  }
  &.options-edit-selectable {
    border-radius: 0 var(--bng-corners-1) var(--bng-corners-1) 0;
    .options-edit-select {
      position: absolute;
      top: 0;
      right: 100%;
      bottom: 0;
      min-height: 100%;
      padding-top: 0.25em;
      --bng-icon-size: 1.5rem;
      background-color: #0008;
      border-radius: var(--bng-corners-1) 0 0 var(--bng-corners-1);
      &.selected {
        background-color: #f60;
        --bng-icon-color: #000;
      }
    }
  }
  &:not(.options-edit-selectable) {
    border-radius: var(--bng-corners-1);
  }
}
</style>
