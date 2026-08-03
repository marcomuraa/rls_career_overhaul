<template>
  <div
    v-if="visible || editable"
    :id="itemId"
    :class="{
      'options-item': true,
      [`options-item-${data.itemType}`]: true,
      'options-item-new': isNew,
      'options-item-editable': editable,
      'options-item-editable-hidden': editable && !visible,
    }"
    v-bind="!disabled && !!data.interactive && { 'bng-nav-priority-container': '' }"
    @contextmenu.stop="editable && onRightClick($event)"
  >
    <div v-if="isNew" class="options-item-version" :data-version="data.version"></div>

    <BngRow
      v-if="useRow"
      class="options-item-row"
      :disabled="disabled"
      :vertical="vertical"
      :no-navigation-handling="!!data.basic_interaction"
      :tooltip="rowTooltipText"
      :tooltip-handler="rowTooltipHandler"
    >
      <template v-if="labelInfo.present" #label>
        <div class="options-item-label">
          <span class="options-item-label-text">
            <DynamicComponent v-if="labelInfo.dynamic" :template="labelInfo.text" />
            <template v-else>{{ labelInfo.text }}</template>
          </span>
          <BngIcon v-if="busy" class="options-item-busy" :type="icons.timer" />
        </div>
      </template>
      <ComponentRender
        :disabled="disabled || busy"
        :data="data"
        :debug-setting="isDebugSetting"
        @click="emit('click', data)"
        @change="emit('change', data, $event)"
      />
    </BngRow>

    <div
      v-else-if="useLabeled"
      class="labeled-option"
      :class="{ 'labeled-option-vertical': vertical }"
      @mouseenter="onStaticInfoShow"
      @mouseleave="onStaticInfoHide"
    >
      <div v-if="labelInfo.present" class="option-label options-item-label" v-bng-disabled="disabled">
        <span class="options-item-label-text">
          <DynamicComponent v-if="labelInfo.dynamic" :template="labelInfo.text" />
          <template v-else>{{ labelInfo.text }}</template>
        </span>
        <BngIcon v-if="busy" class="options-item-busy" :type="icons.timer" />
      </div>
      <ComponentRender
        :disabled="disabled || busy"
        :data="data"
        :debug-setting="isDebugSetting"
        @click="emit('click', data)"
        @change="emit('change', data, $event)"
      />
    </div>

    <ComponentRender
      v-else
      :disabled="disabled || busy"
      :data="data"
      :debug-setting="isDebugSetting"
      @click="emit('click', data)"
      @change="emit('change', data, $event)"
    >
      <template v-if="data.items && data.items.length > 0">
        <Item
          v-for="(item, index) in data.items"
          :key="getOptionItemKey(item)"
          :ignore-new="isNewGroup"
          :disabled="disabled || busy"
          :parent="data"
          :index="index"
          :level="level + 1"
          :data="item"
          :debug-settings="isDebugSetting"
          @click="nestedClick"
          @change="nestedChange"
          :parent-id="curId"
          @edit-cmd="nestedEdit"
        />
      </template>
      <div v-if="editable && 'items' in data" class="options-add-item">
        <BngButton :accent="ACCENTS.outlined" :icon="icons.plus" @click="emit('edit-cmd', 'add', data)">Add group item</BngButton>
      </div>
    </ComponentRender>

    <component
      v-if="editable && EditFloater"
      :is="EditFloater"
      class="options-edit"
      @emit-edit-cmd="emitEdit"
      @edit-menu="openEditMenu"
      selectable
      :selected="editIsSelected"
    />
  </div>
</template>

<script setup>
import { computed, inject } from "vue"
import { BngButton, BngIcon, BngRow, ACCENTS, icons } from "@/common/components/base"
import { DynamicComponent } from "@/common/components/utility"
import { vBngDisabled } from "@/common/directives"
import { $content } from "@/services"
import ComponentRender from "../render/ComponentRender.vue"
import { useOptionItemState } from "../render/itemState"
import { buildRenderTooltip, computeItemLabel } from "../render/renderModel"
import { getOptionItemKey } from "../options"
import "@/common/modules/options/render/itemStyle.scss"

const ROW_ITEM_TYPES = new Set(["checkbox", "link", "slider", "options", "input", "button"])
const LABELED_STATIC_ITEM_TYPES = new Set(["text", "graph"])

const props = defineProps({
  parent: Object,
  index: Number,
  level: Number,
  data: Object,
  debugSettings: Boolean,
  disabled: Boolean,
  parentId: String,
  ignoreNew: Boolean,
})

const settingsValues = inject("settingsValues")
const conditions = inject("conditions")
const itemBusy = inject("itemBusy", null)
const buildItemId = inject("buildItemId")
const categoryIndex = inject("categoryIndex")
const isItemSelected = inject("isItemSelected", undefined)
const showInfo = inject("showInfo")
const editable = inject("editable")
const version = inject("version")

const { isNew, isNewGroup, curId, itemId, isDebugSetting, visible, disabled, showCurrentInfo } =
  useOptionItemState(props, { settingsValues, conditions, buildItemId, categoryIndex, showInfo, version })

const canEdit = import.meta.hot

const EditUI = canEdit ? inject("EditUI") : {}
const EditFloater = computed(() => EditUI.value?.EditFloater)

const emit = defineEmits(["click", "change", "edit-cmd"])
const emitEdit = (event, ...args) => {
  if (!canEdit) return
  if (event === "select") args.unshift(curId.value)
  emit("edit-cmd", event, props.parent, props.index, ...args)
}
const nestedClick = (...args) => emit("click", ...args)
const nestedChange = (...args) => emit("change", ...args)
const nestedEdit = (...args) => canEdit && emit("edit-cmd", ...args)

const openEditMenu = (element, showEdit = false) => canEdit && EditUI.value?.functions.itemEditMenu({ element, parent: props.parent, index: props.index, itemId: curId.value, showEdit })
const editIsSelected = computed(() => canEdit && editable.value && isItemSelected?.(curId.value))

const onRightClick = event => canEdit && openEditMenu(event.target.closest(".options-item") || event.target, true)

const vertical = computed(() => !!props.parent && props.parent.itemType === "group" && props.parent.layout === "row")

const useRow = computed(() => ROW_ITEM_TYPES.has(props.data?.itemType))
const useLabeled = computed(() => LABELED_STATIC_ITEM_TYPES.has(props.data?.itemType))

const labelInfo = computed(() => computeItemLabel(props.data, { debugSetting: isDebugSetting.value }))

// engine freezes while applying some graphics settings; show a static clock icon by the label
const busy = computed(() => !!(itemBusy && props.data?.setting && itemBusy[props.data.setting]))

const rowTooltipText = computed(() => buildRenderTooltip(props.data, disabled.value).info)
const rowTooltipHandler = content => showCurrentInfo(content ? $content.bbcode.parse(content) : undefined)

let staticInfoShown = false
function onStaticInfoShow() {
  if (staticInfoShown) return
  const info = rowTooltipText.value
  if (!info) return
  staticInfoShown = true
  showCurrentInfo($content.bbcode.parse(info))
}
function onStaticInfoHide() {
  if (!staticInfoShown) return
  staticInfoShown = false
  showCurrentInfo(undefined)
}
</script>

<style lang="scss">
@use "@/styles/modules/mixins" as *;

.options-edit {
  opacity: 0.3;
  pointer-events: none;
}

.options-item-label {
  display: flex;
  align-items: center;
  gap: 0.4em;
  width: 100%;
}

.options-item-label-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.options-item-busy {
  --bng-icon-color: var(--bng-gray-200);
  margin-left: auto;
  flex: 0 0 auto;
}

.options-item-group {
  // move edit floater to bottom of group to prevent overlap

  margin-top:0.25em;
  margin-bottom:0.25em;

  > .options-edit {
    top: unset !important;
    bottom: 0 !important;
  }

  // "add item" button container
  .options-add-item {
    flex: 1 0 100%;
    display: block;
    width: 100%;
    text-align: center;
  }
}

.options-item-new:not(.options-item-divider):not(.options-item-subpage) {
  .options-item-version {
    position: absolute;
    left: 0;
    top: -0.5em;
    bottom: -0.5em;
    width: 10em;
    z-index: 1;
    font-size: round(calc-ui-rem(0.6), 1px);
    border-left: 1px solid var(--bng-orange-600);
    pointer-events: none;
    &::before {
      content: attr(data-version);
      position: absolute;
      top: 0;
      left: 0;
      padding: 0em 1.3em 0.1em 0.3em;
      background-image: linear-gradient(-67deg, transparent 0em 1em, var(--bng-orange-600) 1em);
      background-size: 10em 100%;
      background-position: 100% 100%;
      background-repeat: no-repeat;
      color: var(--bng-off-white);
    }
  }
}
.options-item:not(.options-item-new) .options-item-version {
  display: none;
}
</style>
