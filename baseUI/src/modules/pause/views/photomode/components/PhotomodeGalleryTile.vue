<template>
  <button
    ref="tileElement"
    type="button"
    class="photomode-gallery-tile"
    :class="{
      'photomode-gallery-tile--selected': selected,
      'photomode-gallery-tile--compact': compact,
    }"
    :title="tileLabel"
    :aria-label="tileLabel"
    :aria-current="selected ? 'true' : null"
    :tabindex="focusable ? 0 : -1"
    :bng-no-nav="focusable ? null : 'true'"
    :bng-scoped-nav-autofocus="autofocus && focusable ? 'true' : null"
    @click="onSelect"
  >
    <span class="photomode-gallery-tile__visual">
      <img
        v-if="hasPreview"
        class="photomode-gallery-tile__image"
        :src="item.url"
        :alt="itemLabel"
        loading="lazy"
        @error="previewFailed = true"
      />
      <span v-else class="photomode-gallery-tile__fallback">
        {{ itemLabel }}
      </span>
    </span>

    <span v-if="!compact" class="photomode-gallery-tile__caption">
      <span class="photomode-gallery-tile__name">{{ itemLabel }}</span>
      <span v-if="itemDetail" class="photomode-gallery-tile__detail">{{ itemDetail }}</span>
    </span>
  </button>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { $translate } from "@/services/translation"

defineOptions({
  name: "PhotomodeGalleryTile",
  width: 14,
  height: 10,
  margin: 0.35,
})

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  autofocus: {
    type: Boolean,
    default: false,
  },
  interactive: {
    type: Boolean,
    default: true,
  },
  focusable: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(["select"])
const tileElement = ref(null)
const previewFailed = ref(false)

defineExpose({
  getElement() {
    return tileElement.value
  },
})

const hasPreview = computed(() => Boolean(props.item?.url) && previewFailed.value !== true)
const itemLabel = computed(() =>
  props.item?.fileName || props.item?.dateLabel || $translate.instant("ui.photomode.screenshot")
)
const itemDetail = computed(() => props.item?.dateLabel || "")
const tileLabel = computed(() =>
  $translate.instant("ui.photomode.gallery.tileLabel", {
    name: itemLabel.value,
    detail: itemDetail.value || $translate.instant("ui.photomode.recent.savedScreenshot"),
  })
)

function onSelect() {
  if (!props.interactive) return
  emit("select", props.item)
}

watch(() => props.item?.id, () => {
  previewFailed.value = false
}, { immediate: true })
</script>

<style lang="scss" scoped>
@use "@/styles/modules/mixins" as *;

.photomode-gallery-tile {
  --photomode-gallery-tile-bg: rgba(var(--bng-cool-gray-750-rgb), 0.6);
  --photomode-gallery-tile-border: var(--bng-cool-gray-500);

  @include modify-focus(var(--bng-corners-1), 0.0rem);

  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.3rem;
  border: 0;
  border-radius: var(--bng-corners-1);
  background: var(--photomode-gallery-tile-bg);
  box-shadow: inset 0 0 0 0.0625em var(--photomode-gallery-tile-border);
  color: rgba(var(--bng-off-white-rgb), 0.92);
  cursor: pointer;
  text-align: left;
}

.photomode-gallery-tile:hover,
.photomode-gallery-tile:focus-visible {
  --photomode-gallery-tile-bg: rgba(var(--bng-cool-gray-700-rgb), 0.75);
  --photomode-gallery-tile-border: var(--bng-cool-gray-300);
}

.photomode-gallery-tile:active {
  --photomode-gallery-tile-bg: rgba(var(--bng-cool-gray-700-rgb), 0.9);
}

.photomode-gallery-tile--selected {
  --photomode-gallery-tile-bg: rgba(var(--bng-cool-gray-700-rgb), 0.86);
  --photomode-gallery-tile-border: var(--bng-orange-b400);
  box-shadow:
    inset 0 0 0 0.0625em var(--photomode-gallery-tile-border),
    inset 0 0 0 0.18em rgba(var(--bng-orange-b400-rgb), 0.22);
}

.photomode-gallery-tile__visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border-radius: calc(var(--bng-corners-1) * 0.75);
  background:
    linear-gradient(180deg, rgba(var(--bng-off-white-rgb), 0.055), rgba(var(--bng-off-white-rgb), 0.02)),
    rgba(var(--bng-off-black-rgb), 0.35);
  box-shadow: inset 0 0 0 0.0625em rgba(var(--bng-off-white-rgb), 0.06);
}

.photomode-gallery-tile__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photomode-gallery-tile__fallback {
  padding: 0.7rem;
  color: rgba(var(--bng-off-white-rgb), 0.7);
  font-size: 0.82rem;
  line-height: 1.2;
  text-align: center;
  word-break: break-word;
}

.photomode-gallery-tile__caption {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.photomode-gallery-tile__name,
.photomode-gallery-tile__detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photomode-gallery-tile__name {
  font-size: 0.78rem;
  font-weight: 700;
}

.photomode-gallery-tile__detail {
  color: rgba(var(--bng-off-white-rgb), 0.62);
  font-size: 0.68rem;
}

.photomode-gallery-tile--compact {
  gap: 0;
  padding: 0.18rem;
}
</style>
