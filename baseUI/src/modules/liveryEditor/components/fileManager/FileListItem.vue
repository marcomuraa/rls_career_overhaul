<template>
  <div class="file-list-item" :class="{ 'controller-nav-active': Controls.isControllerUsed }">
    <div class="save-info-container">
      <div class="file-name">{{ name }}</div>
      <div class="file-modified">{{ modifiedFormatted }}</div>
      <div class="file-size">{{ fileSizeFormatted }}</div>
    </div>
    <div class="save-file-actions">
      <BngButton :icon="icons.import" @click="$emit('load')" />
      <BngButton :icon="icons.rename" :accent="ACCENTS.secondary" @click="$emit('rename')" />
      <BngButton :icon="icons.trashBin2" :accent="ACCENTS.attention" @click="$emit('delete')" />
    </div>
  </div>
</template>

<script>
export default {
  width: 14,
  height: 6,
  margin: 0.5,
}
</script>

<script setup>
import { BngButton, ACCENTS, icons } from "@/common/components/base"
import useControls from "@/services/controls"

const Controls = useControls()

defineProps({
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  modifiedFormatted: String,
  fileSizeFormatted: String,
  selected: Boolean,
})

defineEmits(["load", "rename", "delete"])
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

.file-list-item {
  $f-offset: 0.25rem;
  $rad: $border-rad-1;

  position: relative;
  display: flex;
  padding: 1em;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: var(--bng-corners-1);

  @include modify-focus($rad, $f-offset);

  >.save-info-container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    >.file-name {
      font-size: 1.25em;
      font-weight: 600;
    }
  }
}

.file-list-item > .save-file-actions {
  display: none;
  align-items: center;
  justify-content: space-between;
}

.file-list-item:hover > .save-file-actions,
.file-list-item:active > .save-file-actions,
.file-list-item:focus-within > .save-file-actions {
  display: flex;
}

// Under controller navigation, keep the actions rendered while this item's
// scope owns focus or is suspended (e.g. by the rename dialog). This ensures
// focus can be restored to the selected button once the popup closes.
.file-list-item.controller-nav-active[data-bng-scoped-nav-state="active"] > .save-file-actions,
.file-list-item.controller-nav-active[data-bng-scoped-nav-state="suspended"] > .save-file-actions {
  display: flex;
}
</style>
