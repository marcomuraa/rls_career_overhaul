<template>
  <div class="bng-path" :bng-no-child-nav="!navigable">
    <Button v-if="showBackButton" class="back-button" sound-class="bng_back_hover_generic" data-breadcrumb-back @click="emit('back')" tabindex="1">
      <BngIcon :type="icons.arrowSmallLeft" class="back-icon" />
      <BngBinding v-show="showBackBinding" ui-event="back" controller track-ignore />
      {{ $tt("ui.common.back") }}
    </Button>
    <template v-for="(item, index) in pathView" :key="index">
      <template v-if="!item.dropdown">
        <Button
          class="bng-path-item"
          :class="{
            'bng-path-simple': simple,
            'bng-path-disabled': disableLastItem && item.last,
            'bng-path-first': item.first,
            'bng-path-last': item.last,
            'bng-path-last-hidden': item.hideUnderline,
          }"
          :accent="ACCENTS.text"
          v-bng-blur="blur"
          data-breadcrumb-item
          @click="onClick(item, index)"
        >{{ $tt(item.label) }}</Button>
        <div
          v-if="simple && (!item.last || item.trailingDivider)"
          class="bng-path-item bng-path-icon"
          :class="{ 'divider-last': hideLastItem && item.dividerLast }"
        >
          <BngIcon :type="item.dividerType || icons.slashRight" v-bng-blur="blur" />
        </div>
      </template>
      <template v-else>
        <Button
          class="bng-path-item bng-path-has-dropdown"
          :accent="ACCENTS.text"
          :icon="icons.arrowSmallRight"
          v-bng-blur="blur"
          v-bng-popover:bottom-start.click="item.dropdown"
          data-breadcrumb-item
        />
        <BngPopoverMenu :name="item.dropdown" focus>
          <template #default="{ hide }">
            <BngButton
              v-for="(subitem, idx) in item.items"
              :key="idx"
              :class="{ selected: idx === item.selected }"
              :accent="ACCENTS.menu"
              v-bng-on-ui-nav:ok.focusRequired.asMouse
              @click="onMenuClick(subitem, hide)"
            >{{ $tt(subitem.label) }}</BngButton>
          </template>
        </BngPopoverMenu>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { BngButton, BngIcon, BngPopoverMenu, ACCENTS, icons, BngBinding } from "@/common/components/base"
import { Button } from "@/common/components/utility"
import { vBngBlur, vBngPopover, vBngOnUiNav } from "@/common/directives"
import { uniqueId } from "@/services/uniqueId"

const bid = uniqueId("bng-path")

const emit = defineEmits(["click", "back"])

const props = defineProps({
  items: Array,
  limit: {
    // how many items to display in path
    type: [Number, String],
    default: 3,
    validator: val => Number(val) > 0,
  },
  simple: Boolean, // disables arrows
  blur: Boolean,
  disableLastItem: Boolean, // makes the last item not clickable
  hideLastItem: Boolean, // hides the last item
  showBackButton: Boolean,
  showBackBinding: {
    type: Boolean,
    default: true,
  },
  navigable: {
    type: Boolean,
    default: true,
  },
})

const pathView = computed(() => {
  // if defined
  if (!Array.isArray(props.items)) return []

  const mapItem = itm => ({
    label: itm.label,
    items: itm.items,
    data: itm,
    dividerType: itm.dividerType,
    trailingDivider: false,
    hideUnderline: false,
    dividerLast: false,
  })

  const items = props.items.map(mapItem)

  // apply limit of displayed items
  const res = props.limit ? items.slice(-props.limit) : items

  // add arrows
  if (!props.simple) {
    const looseCmp = (a, b) => a.label === b.label && a.value === b.value
    const len = res.length
    for (let i = 1; i < len; i++) {
      const idx = len - i
      const items = Array.isArray(res[idx - 1].items) ? res[idx - 1].items : [res[idx].data]
      res.splice(idx, 0, {
        dropdown: `${bid}-sub-${idx}`,
        selected: items.findIndex(itm => looseCmp(itm, res[idx])),
        items: items.map(mapItem),
      })
    }
  }

  // add overflown item
  if (props.limit && items.length > props.limit) {
    res.unshift({
      label: "…",
      data: items[items.length - props.limit - 1],
    })
  }

  // optionally hide the current navigation level (last breadcrumb item)
  if (props.hideLastItem && res.length > 0) {
    res.pop()
    const lastVisibleItem = props.simple ? res.at(-1) : [...res].reverse().find(itm => !itm.dropdown)
    if (lastVisibleItem) {
      lastVisibleItem.hideUnderline = true
      if (props.simple) {
        lastVisibleItem.trailingDivider = true
      }
    }
  }

  if (res.length > 0) {
    res[0].first = true
    res.at(-1).last = true
  }

  if (props.simple) {
    const lastDividerItem = [...res].reverse().find(itm => !itm.dropdown && (!itm.last || itm.trailingDivider))
    if (lastDividerItem) {
      lastDividerItem.dividerLast = true
    }
  }

  return res
})

function onClick(item, index) {
  if (!props.disableLastItem || index < pathView.value.length - 1) {
    emit("click", item.data)
  }
}

function onMenuClick(item, popClose) {
  console.log("onMenuClick", item, popClose)
  popClose()
  emit("click", item.data)
}
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;
@use "@/styles/modules/density" as *;

$corners: var(--bng-corners-1);
$corners2: var(--bng-corners-2);
$background-color: var(--background-color, var(--bng-off-black));

.bng-path {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: stretch;
  overflow: hidden;
  background-color: $background-color;
  border-radius: $corners2;
  --bng-breadcrumbs-enabled-opacity: 0.4;

  .back-button {
    // Custom accent background color variables
    --bng-bg-enabled: var(--bng-off-black);
    --bng-bg-hover: var(--bng-orange-600);
    --bng-bg-active: var(--bng-orange-800);
    --bng-bg-disabled: var(--bng-off-black);

    --bng-bg-border-enabled: var(--bng-cool-gray-600);
    --bng-bg-border-hover: var(--bng-orange-400);
    --bng-bg-border-active: var(--bng-orange-600);
    --bng-bg-border-disabled: rgba(var(--bng-cool-gray-800-rgb), 0.8);

    --bng-bg-enabled-opacity: 0.8;
    --bng-bg-hover-opacity: 1;
    --bng-bg-active-opacity: 1;
    --bng-bg-disabled-opacity: 0.25;

    --bng-bg-border-radius: #{$corners2};

    --bng-button-padding: 0.25em 0.75em 0.25em 0.75em;

    --bng-button-min-width: 2em;

    --bng-content-align: center;

    --bng-button-margin: 0;
    --bng-button-margin: 0;

    margin-right: 0.25em !important;

    >.back-icon {
      width: 0.5em;
      transform: translateX(-0.25em);
    }
  }
  .bng-path-item {
    flex: 0 1 auto;
    margin-left: 0 !important;
    margin-right: 0 !important;
    min-width: unset !important;
    border-radius: 0 !important;
    @include modify-focus($border-rad-1, 0.0rem);

    // --bng-bg-enabled: var(--bng-off-black);
    // --bng-bg-enabled-opacity: 0.4;
    --bng-bg-enabled: #{$background-color};
    --bng-bg-enabled-opacity: var(--bng-breadcrumbs-enabled-opacity, 1);
    --bng-bg-hover: var(--bng-orange-600);
    --bng-bg-hover-opacity: 0.6;
    --bng-bg-active: var(--bng-off-black);
    --bng-bg-active-opacity: 1;
    --bng-bg-disabled: var(--bng-off-black);
    --bng-bg-disabled-opacity: 0.4;

    --bng-button-custom-margin: 0;
    --bng-button-margin: 0;
    --bng-content-align: center;

    // TODO: convert to base button

    --bng-bg-border-radius: 0;

    &.bng-path-first {
      --bng-bg-border-radius: $corners 0 0 $corners;
    }

    &.bng-path-last {
      --bng-bg-border-radius: 0 $corners $corners 0;
    }

    &.bng-path-last:not(.bng-path-last-hidden) {
      :deep(.label) {
        text-decoration-line: underline;
        text-decoration-style: solid;
        text-decoration-thickness: 2px;
        text-decoration-color: var(--bng-orange-500);
      }
    }

    &:not(.bng-path-has-dropdown):not(.bng-path-icon) {
      padding-left: 0.75em;
      padding-right: 0.75em;
      :deep(.label) {
        max-width: 20em;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      &.bng-path-simple:not(.bng-path-first) {
        padding-left: 0.5em;
      }
      &.bng-path-simple:not(.bng-path-last) {
        padding-right: 0.5em;
      }
    }

    &.bng-path-has-dropdown {
      padding-left: 0;
      padding-right: 0.15em;
    }

    &.bng-path-icon {
      position: relative;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 0.75em;
      // margin: 0.25rem 0;
      --bng-icon-size: 1em;
      > span {
        z-index: 1;
      }
      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background-color: $background-color;
        opacity: var(--bng-breadcrumbs-enabled-opacity, 1);
        z-index: 0;
      }
      &.divider-last {
        width: 1.25em;
        padding-right: 0.75em;
      }
    }

    &.bng-path-disabled {
      pointer-events: none;
    }
  }
}
</style>
