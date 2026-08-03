<template>
  <div
    ref="itemRef"
    class="profile-list-item"
    :class="{ selected, active: isActive, incompatible: profile.incompatibleVersion }"
    :data-profile-id="profile.id"
    role="button"
    bng-nav-item
    tabindex="0"
    v-bng-on-ui-nav:ok.focusRequired="select"
    v-bng-on-ui-nav:context.focusRequired="requestDelete"
    v-bng-sound-class="'bng_click_hover_generic'"
    @click="onCardClick"
    @focusin.self="isFocused = true"
    @focusout.self="isFocused = false"
  >
    <span class="profile-thumb" :style="{ backgroundImage: `url(${profile.preview})` }" />
    <span class="profile-main">
      <span class="profile-name">{{ profile.displayName }}</span>
      <span class="profile-subtitle">
        <span v-if="isActive">{{ $ctx_t("ui.career.nowplaying") }}</span>
        <span v-else>{{ $t("ui.career.profiles.vehicleCountShort", { count: profile.vehicleCount }) }}</span>
      </span>
    </span>
    <span class="profile-side">
      <BngUnit :money="profile.money?.value || 0" :formatter="moneyFormatter"  />
      <span>{{ lastPlayedDescription }}</span>
    </span>
    <span class="profile-actions">
      <button
        v-if="isControllerUsed"
        class="profile-action"
        type="button"
        bng-no-nav="true"
        tabindex="-1"
        v-bng-sound-class="'bng_main_secondary_onlyClick'"
        :title="$t('ui.common.select')"
        @click.stop="select"
      >
        <BngBinding v-if="isControllerUsed && isFocused" class="profile-action-binding" ui-event="ok" controller />
        <BngIcon class="profile-action-icon" type="steeringWheelSporty" />
      </button>
      <button
        class="profile-action profile-action--danger"
        type="button"
        bng-no-nav="true"
        tabindex="-1"
        :disabled="isActive"
        v-bng-sound-class="'bng_click_generic'"
        :title="$t('ui.career.delete')"
        @click.stop="requestDelete"
      >
        <BngBinding v-if="isControllerUsed && isFocused" class="profile-action-binding" ui-event="context" controller />
        <BngIcon class="profile-action-icon" type="trashBin1" />
      </button>
    </span>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { storeToRefs } from "pinia"
import { BngBinding, BngIcon, BngUnit } from "@/common/components/base"
import { vBngOnUiNav, vBngSoundClass } from "@/common/directives"
import useControls from "@/services/controls"
import { timeSpan } from "@/utils/datetime"
import { $translate } from "@/services/translation"
import { shrinkNum } from "@/utils/format"

const props = defineProps({
  profile: {
    type: Object,
    required: true,
  },
  selected: Boolean,
  isActive: Boolean,
})

const emit = defineEmits(["select", "delete"])

const itemRef = ref(null)
const isFocused = ref(false)
const controls = useControls()
const { isControllerUsed } = storeToRefs(controls)
const formatterFn = num => shrinkNum(num, 1)
const moneyFormatter = computed(() => (props.profile.money?.value > 100000 ? formatterFn : undefined))
const lastPlayedDescription = computed(() =>
  props.profile.date ? timeSpan(props.profile.date, null, 1, true) : $translate.instant("ui.common.unknown"))

function select() {
  emit("select", props.profile.id)
  return false
}

function requestDelete() {
  if (props.isActive) return false
  emit("delete", props.profile)
  return false
}

function onCardClick(event) {
  if (event.target.closest?.(".profile-action")) return
  select()
}

defineExpose({
  getElement() {
    return itemRef.value
  },
})
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.profile-list-item {
  @include modify-focus(var(--bng-corners-1), 0px);
  width: 100%;
  min-height: calc-ui-rem(5.4);
  display: grid;
  grid-template-columns: calc-ui-rem(5) minmax(0, 1fr) auto auto;
  align-items: center;
  gap: calc-ui-rem(0.75);
  padding: calc-ui-rem(0.5);
  border: 0;
  border-radius: var(--bng-corners-2);
  color: var(--bng-off-white);
  background-color: rgba(var(--bng-cool-gray-800-rgb), 0.72);
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus,
  &.focus-visible {
    background-color: rgba(var(--bng-cool-gray-700-rgb), 0.85);
  }

  &.selected {
    background-image: linear-gradient(90deg, rgba(var(--bng-orange-600-rgb), 0.48), rgba(var(--bng-cool-gray-800-rgb), 0.78));
    box-shadow: inset calc-ui-rem(0.25) 0 0 var(--bng-orange-300);
  }

  &.active {
    box-shadow: inset calc-ui-rem(0.25) 0 0 var(--bng-orange-400);
  }

  &.selected.active {
    box-shadow:
      inset calc-ui-rem(0.25) 0 0 var(--bng-orange-300),
      inset calc-ui-rem(0.5) 0 0 rgba(var(--bng-orange-900-rgb), 0.55);
  }

  &.incompatible {
    filter: grayscale(1);
    opacity: 0.72;
  }
}

.profile-thumb {
  align-self: stretch;
  border-radius: var(--bng-corners-1);
  background-size: cover;
  background-position: center;
  background-color: rgba(var(--bng-cool-gray-700-rgb), 0.75);
}

.profile-main,
.profile-side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc-ui-rem(0.25);
  :deep(.icon) {
    color: rgba(var(--bng-off-white-rgb), 0.72);
  }
}

.profile-name {
  font-weight: 800;
  font-size: calc-ui-rem(1.05);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-subtitle,
.profile-side {
  color: rgba(var(--bng-off-white-rgb), 0.72);
  font-size: calc-ui-rem(0.85);
}

.profile-side {
  align-items: flex-end;
  text-align: right;
}

.profile-actions {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: calc-ui-rem(0.2);
  visibility: hidden;
  width: 0;

  .profile-list-item:hover &,
  .profile-list-item:focus &,
  .profile-list-item.focus-visible &,
  .profile-list-item:focus-within & {
    visibility: visible;
    width: auto;
  }
}

.profile-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc-ui-rem(0.2);
  min-width: calc-ui-rem(2.2);
  height: calc-ui-rem(2.2);
  padding: 0 0.5rem;
  border: 0;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-700-rgb), 0.68);
  color: var(--bng-off-white);
  cursor: pointer;
  font-size: calc-ui-rem(0.8);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;

  .profile-list-item:hover &,
  .profile-list-item:focus &,
  .profile-list-item.focus-visible &,
  .profile-list-item:focus-within & {
    opacity: 1;
    pointer-events: auto;
  }

  &:hover {
    background: rgba(var(--bng-cool-gray-600-rgb), 0.8);
  }

  &:disabled {
    cursor: default;
    opacity: 0.42;
    pointer-events: none;
  }
}

.profile-action--danger:hover {
  background: rgba(var(--bng-add-red-700-rgb), 0.62);
}

.profile-action-icon {
  --bng-icon-size: 1.25em;
}

.profile-action-binding {
  display: inline-flex;
}
</style>
